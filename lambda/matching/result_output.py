import json
import boto3
import os
from decimal import Decimal


def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, list):
        return [decimal_to_float(item) for item in obj]
    if isinstance(obj, dict):
        return {key: decimal_to_float(value) for key, value in obj.items()}
    return obj

def lambda_handler(event, context):
    try:
        # DynamoDBテーブル名を環境変数から取得
        matching_table_name = os.environ.get('MATCHING_TABLE_NAME')
        question_table_name = os.environ.get('QUESTION_TABLE_NAME')
        recommend_table_name = os.environ.get('QUESTION_TABLE_NAME')
        if not matching_table_name:
            raise ValueError("TABLE_NAME environment variable is missing")

        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(matching_table_name)

        # イベントからデータを取得
        if 'body' not in event:
            raise ValueError("Request body is missing")

        body = json.loads(event['body'])
        id = body.get('id')

        if not id:
            raise ValueError("Both 'id' and 'data' fields are required in the request body")


        # DynamoDBから指定されたidに基づいてデータを取得
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('matchingId').eq(id)
        )
        items = response.get('Items')
        # Decimalオブジェクトをfloatに変換
        items = decimal_to_float(items)


        # 該当データが存在しない場合
        if not items:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Item not found'})
            }

        # 該当データが存在する場合
        return {
            'statusCode': 200,
            'body': json.dumps({'item': items})
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
