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

        if not id:
            raise ValueError("Both 'id' and 'data' fields are required in the request body")


        # DynamoDBから指定されたidに基づいてデータを取得
        response = table.get_item(Key={'id': id})
        item = response.get('Item')

        # 該当データが存在しない場合
        if not item:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Item not found'})
            }

        # 該当データが存在する場合
        return {
            'statusCode': 200,
            'body': json.dumps({'item': item})
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
