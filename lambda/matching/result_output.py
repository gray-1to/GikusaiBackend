import json
import boto3
import os
from decimal import Decimal
import math
import traceback

def euclidean_distance(arr1, arr2):
    # ユークリッド距離を計算
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(arr1, arr2)))


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
        recommend_table_name = os.environ.get('RECOMMEND_TABLE_NAME')
        if not matching_table_name:
            raise ValueError("TABLE_NAME environment variable is missing")

        dynamodb = boto3.resource('dynamodb')
        matching_table = dynamodb.Table(matching_table_name)
        recommend_table = dynamodb.Table(recommend_table_name)

        body = json.loads(event['body'])
        matching_id = body.get('matchingId')
        choice_params = body.get('choiceParams')
        param_to_choice_value = { choice_param['choiceName']: choice_param['value'] for choice_param in choice_params}

        print('choice_params', choice_params)

        if matching_id is None or choice_params is None:
            raise ValueError("Both 'matchingId' and 'choiceParams' fields are required in the request body")


        # DynamoDBから指定されたidに基づいてデータを取得
        response = matching_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('matchingId').eq(matching_id)
        )
        items = response.get('Items')
        print("items", items)
        recommend_ids: list[str] = items[0]['recommendIds']
        params = items[0]['parameters']
        choice_vector = [param_to_choice_value.get(param, 0) for param in params]

        min_distance = float('inf')
        nearest_recommend = None
        for recommend_id in recommend_ids:
            print("recommend_id",recommend_id)
            response = recommend_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('recommendId').eq(recommend_id)
            )
            recommends = response.get('Items')
            recommend = recommends[0] if recommends else None
            if recommend is None:
                continue
            recommend_params = recommend['recommendParams']
            recommend_params_to_value = { recommend_param['paramsName']: float(recommend_param['value']) for recommend_param in recommend_params}
            recommend_vector = [recommend_params_to_value.get(param, 0) for param in params]
            
            print("choice_vector", choice_vector)
            print("recommend_vector", recommend_vector)
            distance = euclidean_distance(choice_vector, recommend_vector)
            if distance < min_distance:
                min_distance = distance
                nearest_recommend = recommend

        result = {
            "recommend": nearest_recommend["recommendText"],
            "url": nearest_recommend["url"]
        }
        
        return {
            'statusCode': 200,
            "headers": {
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*"
            },
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
          'error': str(e),
          'trace': traceback.format_exc()
            })
        }
