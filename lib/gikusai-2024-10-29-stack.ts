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
    const table = new dynamodb.Table(this, "HelloTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING }, // 主キーを定義
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
        resources: [table.tableArn],
      })
    );

    // Lambda関数を定義
    const helloLambda = new lambda.Function(this, "HelloLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "hello.lambda_handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambda")),
      role: lambdaExecutionRole,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName, // 環境変数にDynamoDBテーブル名を設定
      },
    });

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
          TABLE_NAME: table.tableName, // 環境変数にDynamoDBテーブル名を設定
        },
      }
    );

    // matching/list
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
          TABLE_NAME: table.tableName, // 環境変数にDynamoDBテーブル名を設定
        },
      }
    );

    // matching/list
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
          TABLE_NAME: table.tableName, // 環境変数にDynamoDBテーブル名を設定
        },
      }
    );

    // API Gatewayを作成してLambda関数を統合
    const api = new apigateway.LambdaRestApi(this, "HelloLambdaApi", {
      handler: helloLambda,
      proxy: false,
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
    ); // POSTメソッドを追加
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
    ); // POSTメソッドを追加
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
    new cdk.CfnOutput(this, "DynamoDBTableName", {
      value: table.tableName,
    });
  }
}
