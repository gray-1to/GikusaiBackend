import json
import boto3
import os
import time
import uuid

def lambda_handler(event, context):
    try:
        # DynamoDBテーブル名を環境変数から取得
        matching_table_name = os.environ.get('MATCHING_TABLE_NAME')
        question_table_name = os.environ.get('QUESTION_TABLE_NAME')
        recommend_table_name = os.environ.get('RECOMMEND_TABLE_NAME')

        if not matching_table_name:
            raise ValueError("MATCHING_TABLE_NAME environment variable is missing")

        dynamodb = boto3.resource('dynamodb')
        matching_table = dynamodb.Table(matching_table_name)
        question_table = dynamodb.Table(question_table_name)
        recommend_table = dynamodb.Table(recommend_table_name)

        # イベントからデータを取得
        if 'body' not in event:
            raise ValueError("Request body is missing")

        body = json.loads(event['body'])
        title = body.get('title')
        author_name = body.get('authorName')
        description = body.get('description')
        params_name = body.get('paramsName')
        questions = body.get('questions')
        recommends = body.get('recommends')

        # 必須フィールドの確認
        if not all([id, title, author_name, description, params_name, questions]):
            raise ValueError("All fields (id, title, authorName, description, paramsName, questions) are required in the request body")

        matching_id = str(uuid.uuid4())
        question_ids = []

        # DynamoDBにデータを保存
        for question in questions:
            question_id = str(uuid.uuid4())
            question_text = question.get('question')
            choices = question.get('choices', [])

            question_table.put_item(
                Item={
                    'questionId': question_id,
                    'matchingId': matching_id,
                    'questionText': question_text,
                    'choices': choices,
                    'createdAt': int(time.time())
                }
            )

            question_ids.append(question_id)

        recommend_ids = []

        for recommend in recommends:
            recomnmend_id = str(uuid.uuid4())
            recommend_text = recommend.get('recommendText')
            url = recommend.get('url')
            recommendParams = recommend.get('recommendParams', [])

            recommend_table.put_item(
                Item={
                    'recommendId': recomnmend_id,
                    'matchingId': matching_id,
                    'recommendText': recommend_text,
                    'url': url,
                    'recommendParams': recommendParams,
                    'createdAt': int(time.time())
                }
            )

            recommend_ids.append(recomnmend_id)

        matching_table.put_item(
            Item={
                'matchingId': matching_id,
                'recommendIds': recommend_ids,
                'questionIds': question_ids,
                'title': title,
                'authorName': author_name,
                'description': description,
                'parameters': params_name,
                'createdAt': int(time.time())
            }
        )

        return {
            'statusCode': 200,
            'body': json.dumps({'message': f'Data {id} saved successfully!'})
        }

    except ValueError as ve:
        # 入力データが不足している場合のエラーハンドリング
        return {
            'statusCode': 400,
            'body': json.dumps({'error': str(ve)})
        }
    except json.JSONDecodeError:
        # JSONデコードエラーの場合
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON format in request body'})
        }
    except Exception as e:
        # その他のエラーの場合
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'An unexpected error occurred: ' + str(e)})
        }
