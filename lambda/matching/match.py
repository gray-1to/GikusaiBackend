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
    matching_table = dynamodb.Table(matching_table_name)
    question_table = dynamodb.Table(question_table_name)

    try:
        id = event.get('queryStringParameters', {}).get('id')

        if not id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'id is required in the request body'})
            }

        matching_table_response = matching_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('matchingId').eq(id)
        )
        matchings = matching_table_response.get('Items')
        matching = matchings[0] if matchings else None

        if not matching:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Matching item not found'})
            }

        question_ids = matching.get('questionIds', [])
        question_list = []
        for question_id in question_ids:
            question_table_response = question_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('questionId').eq(question_id)
            )
            questions = question_table_response.get('Items')
            question = questions[0] if questions else None

            if question:
                question_for_res = {
                    "question": question.get("questionText", "No question text available"),
                    "choices": question.get("choices", [])
                }
                question_list.append(question_for_res)
            else:
                print(f"Warning: No question found for questionId {question_id}")

        matching = decimal_to_float(matching)
        question_list = decimal_to_float(question_list)

        result = {
            "title": matching["title"],
            "userName": matching["authorName"],
            "description": matching["description"],
            "paramsName": matching["parameters"],
            "questions": question_list
        }

        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
