import * as cdk from 'aws-cdk-lib';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import 'dotenv/config';
import * as path from 'path';
import { execSync } from 'child_process';
import { cpSync } from 'fs';

export class CartServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dbPassword = process.env.DB_PASSWORD;
    if (!dbPassword) throw new Error('DB_PASSWORD env var is required');

    const appRoot = path.join(__dirname, '../..');

    const vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', {
      vpcId: 'vpc-04454383735ef1921',
    });

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      'CartLambdaSecurityGroup',
      {
        vpc,
        allowAllOutbound: true,
      },
    );

    const dbSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'ExistingDbSecurityGroup',
      'sg-043689300ea3ce32f',
    );

    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to PostgreSQL',
    );

    const cartLambda = new Function(this, 'CartLambda', {
      runtime: Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      securityGroups: [lambdaSecurityGroup],
      allowPublicSubnet: true,
      environment: {
        DB_HOST: process.env.DB_HOST!,
        DB_PORT: '5432',
        DB_NAME: 'postgres',
        DB_USER: 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD!,
        DB_SSL: 'true',
        NODE_ENV: 'production',
      },
      code: Code.fromAsset(appRoot, {
        bundling: {
          local: {
            tryBundle(outputDir: string): boolean {
              try {
                execSync('npm run build', { cwd: appRoot, stdio: 'inherit' });
                cpSync(path.join(appRoot, 'dist'), outputDir, {
                  recursive: true,
                });
                cpSync(
                  path.join(appRoot, 'package.json'),
                  path.join(outputDir, 'package.json'),
                );
                cpSync(
                  path.join(appRoot, 'package-lock.json'),
                  path.join(outputDir, 'package-lock.json'),
                );
                execSync('npm ci --omit=dev', {
                  cwd: outputDir,
                  stdio: 'inherit',
                });
                return true;
              } catch {
                return false;
              }
            },
          },
          image: Runtime.NODEJS_22_X.bundlingImage,
          command: [
            'bash',
            '-c',
            [
              'npm ci',
              'npm run build',
              'cp -r dist/* /asset-output/',
              'cp package.json package-lock.json /asset-output/',
              'cd /asset-output && npm ci --omit=dev',
            ].join(' && '),
          ],
        },
      }),
    });

    const cartApi = new apigateway.LambdaRestApi(this, 'CartApi', {
      handler: cartLambda,
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*'],
      },
    });

    new cdk.CfnOutput(this, 'CartApiUrl', {
      value: cartApi.url,
      description: 'Cart Service API URL',
    });
  }
}
