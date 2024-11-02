import json
import boto3
import os

def lambda_handler(event, context):
    try:
        # DynamoDBテーブル名を環境変数から取得
        table_name = os.environ.get('TABLE_NAME')
        if not table_name:
            raise ValueError("TABLE_NAME environment variable is missing")

        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)

        # イベントからデータを取得
        if 'body' not in event:
            raise ValueError("Request body is missing")

        body = json.loads(event['body'])
        id = body.get('id')
        data = body.get('data')

        if not id or not data:
            raise ValueError("Both 'id' and 'data' fields are required in the request body")

        # DynamoDBにデータを保存
        table.put_item(
            Item={
                'id': id,
                'data': data,
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
