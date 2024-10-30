import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
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
    const role = new Role(this, "LambdaExecutionRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    role.addToPolicy(
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
    role.addToPolicy(
      new PolicyStatement({
        actions: ["dynamodb:PutItem"],
        effect: Effect.ALLOW,
        resources: [table.tableArn],
      })
    );

    // Lambda関数を定義
    const helloLambda = new lambda.Function(this, "HelloLambdaFunction", {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: "hello.lambda_handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambda")),
      role: role,
      timeout: cdk.Duration.seconds(30),
      environment: {
        TABLE_NAME: table.tableName, // 環境変数にDynamoDBテーブル名を設定
      },
    });

    // API Gatewayを作成してLambda関数を統合
    const api = new apigateway.LambdaRestApi(this, "HelloLambdaApi", {
      handler: helloLambda,
      proxy: false,
    });

    // リソースとメソッドを追加
    const helloResource = api.root.addResource("hello");
    helloResource.addMethod("GET"); // POSTメソッドを追加
    helloResource.addMethod("OPTIONS", new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": "'*'",
          "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET'",
          "method.response.header.Access-Control-Allow-Headers": "'Content-Type'",
        },
      }],
      passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
    }), {
      methodResponses: [{
        statusCode: "200",
        responseParameters: {
          "method.response.header.Access-Control-Allow-Origin": true,
          "method.response.header.Access-Control-Allow-Methods": true,
          "method.response.header.Access-Control-Allow-Headers": true,
        },
      }],
    });

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
