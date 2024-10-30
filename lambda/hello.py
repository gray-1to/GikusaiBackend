import json
import boto3
import os

def lambda_handler(event, context):
    # DynamoDBテーブル名を環境変数から取得
    table_name = os.environ['TABLE_NAME']
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(table_name)

    # イベントからデータを取得
    body = json.loads(event['body'])
    id = "test_id"
    data = "test_data"

    # DynamoDBにデータを保存
    table.put_item(
        Item={
            'id': id,
            'data': data,
        }
    )

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Data saved successfully!'})
    }
