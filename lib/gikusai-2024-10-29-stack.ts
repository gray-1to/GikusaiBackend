import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as path from "path";

export class Gikusai20241029Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDBテーブルを作成
    const matchingTable = new dynamodb.Table(this, "MatchingTable", {
      tableName: "matching-table", // テーブル名の定義
      partitionKey: {
        //パーティションキーの定義
        name: "matchingId",
        type: dynamodb.AttributeType.STRING, // typeはあとNumberとbinary
      },
      sortKey: {
        // ソートキーの定義
        name: "createdAt",
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // オンデマンド請求
      pointInTimeRecovery: true, // PITRを有効化
      timeToLiveAttribute: "expired", // TTLの設定
      removalPolicy: cdk.RemovalPolicy.DESTROY, // cdk destroyでDB削除可
    });

    const questionTable = new dynamodb.Table(this, "QuestionTable", {
      tableName: "question-table", // テーブル名の定義
      partitionKey: {
        //パーティションキーの定義
        name: "questionId",
        type: dynamodb.AttributeType.STRING, // typeはあとNumberとbinary
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // オンデマンド請求
      pointInTimeRecovery: true, // PITRを有効化
      timeToLiveAttribute: "expired", // TTLの設定
      removalPolicy: cdk.RemovalPolicy.DESTROY, // cdk destroyでDB削除可
    });

    const recommendTable = new dynamodb.Table(this, "RecommendTable", {
      tableName: "recommend-table", // テーブル名の定義
      partitionKey: {
        //パーティションキーの定義
        name: "recommendId",
        type: dynamodb.AttributeType.STRING, // typeはあとNumberとbinary
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // オンデマンド請求
      pointInTimeRecovery: true, // PITRを有効化
      timeToLiveAttribute: "expired", // TTLの設定
      removalPolicy: cdk.RemovalPolicy.DESTROY, // cdk destroyでDB削除可
    });

    // Lambda実行に必要なIAMロールを作成
    const lambdaExecutionRole = new Role(this, "LambdaExecutionRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    lambdaExecutionRole.addToPolicy(
      new PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        effect: Effect.ALLOW,
        resources: ["*"],
      })
    );

    // DynamoDBへの書き込み権限をLambdaに追加
    lambdaExecutionRole.addToPolicy(
      new PolicyStatement({
        actions: [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:ConditionCheckItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ],
        effect: Effect.ALLOW,
        resources: [matchingTable.tableArn, questionTable.tableArn, recommendTable.tableArn],
      })
    );

    // Lambda関数を定義
    // matching/list
    const MatchingListLambda = new lambda.Function(
      this,
      "MatchingListLambdaFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: "list.lambda_handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/matching")),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(30),
        environment: {
          MATCHING_TABLE_NAME: matchingTable.tableName,
        },
      }
    );

    // matching/match
    const MatchingMatchLambda = new lambda.Function(
      this,
      "MatchingMatchLambdaFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: "match.lambda_handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/matching")),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(30),
        environment: {
          MATCHING_TABLE_NAME: matchingTable.tableName,
          QUESTION_TABLE_NAME: questionTable.tableName,
          RECOMMEND_TABLE_NAME: recommendTable.tableName,
        },
      }
    );

    // matching/result_output
    const MatchingResultOutputLambda = new lambda.Function(
      this,
      "MatchingResultOutputLambdaFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: "result_output.lambda_handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/matching")),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(30),
        environment: {
          MATCHING_TABLE_NAME: matchingTable.tableName,
          QUESTION_TABLE_NAME: questionTable.tableName,
          RECOMMEND_TABLE_NAME: recommendTable.tableName,
        },
      }
    );

    // matching/post
    const MatchingPostLambda = new lambda.Function(
      this,
      "MatchingPostLambdaFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_11,
        handler: "post.lambda_handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/matching")),
        role: lambdaExecutionRole,
        timeout: cdk.Duration.seconds(30),
        environment: {
          MATCHING_TABLE_NAME: matchingTable.tableName,
          QUESTION_TABLE_NAME: questionTable.tableName,
          RECOMMEND_TABLE_NAME: recommendTable.tableName,
        },
      }
    );

    // API Gatewayを作成してLambda関数を統合
    const api = new apigateway.RestApi(this, "GikusaiLambdaApi", {
      restApiName: 'GikusaiAPIGateway',
    });

    // リソースとメソッドを追加
    const helloResource = api.root.addResource("hello");
    helloResource.addMethod("GET");
    helloResource.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'OPTIONS,GET'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
        ],
      }
    );

    const matchingResource = api.root.addResource("matching");
    const matchingListResource = matchingResource.addResource("list");
    matchingListResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(MatchingListLambda)
    );
    matchingListResource.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'OPTIONS,GET'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
        ],
      }
    );

    const matchingMatchResource = matchingResource.addResource("match");
    matchingMatchResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(MatchingMatchLambda)
    );
    matchingMatchResource.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'OPTIONS,GET'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
        ],
      }
    );

    const matchingResultOutputResource = matchingResource.addResource("result_output");
    matchingResultOutputResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(MatchingResultOutputLambda)
    );
    matchingResultOutputResource.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'OPTIONS,GET'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
        ],
      }
    );

    const matchingPostResource = matchingResource.addResource("post");
    matchingPostResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(MatchingPostLambda)
    );
    matchingPostResource.addMethod(
      "OPTIONS",
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'OPTIONS,GET'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type'",
            },
          },
        ],
        passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": true,
              "method.response.header.Access-Control-Allow-Methods": true,
              "method.response.header.Access-Control-Allow-Headers": true,
            },
          },
        ],
      }
    );

    // APIエンドポイントURLを出力
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
    });

    // DynamoDBテーブルの出力
    new cdk.CfnOutput(this, "DynamoDBMatchingTableName", {
      value: matchingTable.tableName,
    });
    new cdk.CfnOutput(this, "DynamoDBQuestionTableName", {
      value: questionTable.tableName,
    });
    new cdk.CfnOutput(this, "DynamoDBRecommendTableName", {
      value: recommendTable.tableName,
    });
  }
}
