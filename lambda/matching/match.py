import json
import boto3
import os

def lambda_handler(event, context):
    # DynamoDBテーブル名を環境変数から取得
    table_name = os.environ['TABLE_NAME']
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)

    try:
        # クエリパラメータからidを取得
        id = event.get('queryStringParameters', {}).get('id')

        # idが指定されていない場合はエラーレスポンスを返す
        if not id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'id is required in the request body'})
            }

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
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
