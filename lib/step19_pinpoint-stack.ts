import { Duration, Expiration, Stack, StackProps } from 'aws-cdk-lib';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as pinpoint from 'aws-cdk-lib/aws-pinpoint';
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class Step19PinpointStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //giving role to the lambda function
    const role = new Role(this, "LambdaRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com")                      //lambda function ko role dedia hai 
    });

    //now attaching pinpoint to the policy - role jo lambda function ko dia hai ab usko policy bhi deinge
    role.addToPolicy(
      new PolicyStatement({
        actions: ["mobiletargeting:SendMessages", "logs:*"],
        resources: ["*"]
      })
    );

    //AppSync Api 
    const api = new appsync.GraphqlApi(this, "EmailApi", {
      name: "Pinpoint-In-Pracitce",
      schema: appsync.Schema.fromAsset('graphql/schema.gql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: Expiration.after(Duration.days(365))
          }
        }
      }
    });

    // Create a Pinpoint project
    const pinpointProject = new pinpoint.CfnApp(this, "project", {
      name: "PinPointPractice"
    });

    //  Enable Email Channel to send emails in the pinpoint
    const emailChannel = new pinpoint.CfnEmailChannel(this, "PinPointEmailChannel", {
      applicationId: "projectID_from_where_to_send_emails",
      enabled: true,
      fromAddress: "EMAIL_ADDRESS",
      // The Amazon Resource Name (ARN) of the identity, verified with Amazon Simple Email Service (Amazon SES), 
      // that you want to use when you send email through the channel.
      identity: "Identity"
    });

    //lambda function
    const Lambda = new lambda.Function(this, "Pin_point_lambdafunction", {
      functionName: "LambdaForPinpoint",
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      role: role,
      memorySize: 1024
    });

    //Adding lambda as a data Source
    const lambdaDs = api.addLambdaDataSource("LambdaDataSource", Lambda);

    //Creating Resolver
    lambdaDs.createResolver({
      typeName: "Mutation",
      fieldName: "createEmail"
    });

  }
}
