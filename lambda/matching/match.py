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
    matching_table_name = os.environ['MATCHING_TABLE_NAME']
    question_table_name = os.environ['QUESTION_TABLE_NAME']
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(matching_table_name)

    try:
        id = event.get('queryStringParameters', {}).get('id')

        if not id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'id is required in the request body'})
            }

        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('matchingId').eq(id)
        )
        items = response.get('Items')
        item = items[0] if items else None

        if not item:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Item not found'})
            }

        item = decimal_to_float(item)

        return {
            'statusCode': 200,
            'body': json.dumps({'item': item})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
