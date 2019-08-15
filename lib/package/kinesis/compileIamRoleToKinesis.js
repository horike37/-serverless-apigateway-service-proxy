'use strict'
const _ = require('lodash')
const BbPromise = require('bluebird')

module.exports = {
  async compileIamRoleToKinesis() {
    await BbPromise.all(
      this.getAllServiceProxies().map(async (serviceProxy) => {
        const serviceName = this.getServiceName(serviceProxy)
        if (serviceName == 'kinesis') {
          const { streamName } = serviceProxy[serviceName]
          const template = {
            Type: 'AWS::IAM::Role',
            Properties: {
              AssumeRolePolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                  {
                    Effect: 'Allow',
                    Principal: {
                      Service: 'apigateway.amazonaws.com'
                    },
                    Action: 'sts:AssumeRole'
                  }
                ]
              },
              Policies: [
                {
                  PolicyName: 'apigatewaytokinesis',
                  PolicyDocument: {
                    Version: '2012-10-17',
                    Statement: [
                      {
                        Effect: 'Allow',
                        Action: [
                          'logs:CreateLogGroup',
                          'logs:CreateLogStream',
                          'logs:PutLogEvents'
                        ],
                        Resource: '*'
                      },
                      {
                        Effect: 'Allow',
                        Action: ['kinesis:PutRecord'],
                        Resource: {
                          'Fn::Sub': [
                            'arn:aws:kinesis:${AWS::Region}:${AWS::AccountId}:stream/${streamName}',
                            { streamName }
                          ]
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }

          _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
            ApigatewayToKinesisRole: template
          })
        }
      })
    )
  }
}
