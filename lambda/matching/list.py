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
    # DynamoDBテーブル名を環境変数から取得
    table_name = os.environ["MATCHING_TABLE_NAME"]
    dynamodb = boto3.resource("dynamodb")
    table = dynamodb.Table(table_name)

    try:
        # DynamoDBから全データを取得
        response = table.scan()
        items = response.get("Items", [])
        # Decimalオブジェクトをfloatに変換
        items = decimal_to_float(items)

        matching_list = []
        for item in items:
            matching_data = {
                "matchingId": item.get("matchingId", ""),
                "title": item.get("title", ""),
                "description": item.get("description", ""),
                "createdAt": item.get("createdAt", ""),
                "authorName": item.get("authorName", ""),
            }
            matching_list.append(matching_data)

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
            "body": json.dumps(matching_list),
        }
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
