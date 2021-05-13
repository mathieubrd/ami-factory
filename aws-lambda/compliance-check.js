const AWS = require('aws-sdk')
const EC2 = new AWS.EC2()
const CodePipeline = new AWS.CodePipeline()
const SSM = new AWS.SSM()

var instanceId = 0;

const sleep = async (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const runInstance = async () => {
  console.debug('runInstance')

  const result = await EC2.runInstances({
      MinCount: 1,
      MaxCount: 1,
      LaunchTemplate: {
        LaunchTemplateName: 'amifactory-rhel8'
      }
  }).promise()
    
  return result.Instances[0].InstanceId
}

const runSsmShellScript = async (instanceId, commands) => {
  console.debug(`runSsmShellScript ${commands}`)

  const result = await SSM.sendCommand({
    DocumentName: 'AWS-RunShellScript',
    InstanceIds: [ instanceId ],
    Parameters: {
      'commands': commands,
      'workingDirectory': ['/tmp']
    }
  }).promise()

  return await waitForCommandCompleted(result.Command.CommandId, instanceId)
}

const installTools = async (instanceId) => {
  console.debug(`Installing tools on ${instanceId}`)

  return runSsmShellScript(instanceId,
    [
      "yum install -y openscap-scanner unzip",
      "curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o awscliv2.zip",
      "unzip awscliv2.zip",
      "./aws/install"
    ])
}

const terminateInstance = async (instanceId) => {
  console.debug('terminateInstance')

  return EC2.terminateInstances({
      InstanceIds: [ instanceId ]
  }).promise()
}

const waitForSsmAgentRunning = async instanceId => {
  return new Promise((resolve, reject) => {
    (async function polling(){
      console.debug('waitForSsmAgentRunning')

      try {
        const result = await SSM.describeInstanceInformation({
          InstanceInformationFilterList: [
            {
              key: 'InstanceIds',
              valueSet: [ instanceId ]
            }
          ]
        }).promise()
  
        if (result.InstanceInformationList.length > 0) {
          return resolve(result)
        }

        setTimeout(polling, 5000);
      } catch (err) {
        reject(err)
      }
    })()
  })
}

const waitForCommandCompleted = async (commandId, instanceId) => {
  await sleep(1000)
  
  console.debug(`waitForCommandCompleted ${commandId} ${instanceId}`)
  
  return new Promise((resolve, reject) => {
    (async function polling(){
      try {
        const result = await SSM.getCommandInvocation({
          CommandId: commandId,
          InstanceId: instanceId
        }).promise()
        
        const status = result.Status
  
        if (status === 'Success') {
          return resolve()
        } else if (status === 'Failed' || status === 'TimedOut') {
            return reject({ message: `SSM command ${commandId} failed: ${result.StatusDetails}`})
        }
        
        setTimeout(polling, 5000);
      } catch (err) {
        reject(err)
      }
    })()
  })
}

const copyArtifactFromS3ToInstance = async (instanceId, bucketName, objectKey, artifactName) => {
  console.debug(`copyArtifactFromS3ToInstance ${instanceId} ${bucketName} ${objectKey}`)
  
  const commands = [
    `aws s3 cp s3://${bucketName}/${objectKey} ${artifactName}`,
    `unzip ${artifactName}`
  ]

  return await runSsmShellScript(instanceId, commands)
}

const complianceChecks = async (instanceId, reportFilename, remediationReportFilename, datastream) => {
  console.debug(`complianceChecks ${datastream}`)

  return await runSsmShellScript(instanceId, [
    `oscap xccdf eval --profile standard --report ${reportFilename} ${datastream} || true`,
    `oscap xccdf eval --profile standard --remediate --report ${remediationReportFilename} ${datastream} || true`
  ])
}

const copyReportToBucket = async (instanceId, reportFilename, remediationReportFilename, bucket) => {
  console.debug(`copyReportToBucket ${instanceId} ${reportFilename} ${bucket}`)
  
  return await runSsmShellScript(instanceId, [
    `aws s3 cp ${reportFilename} s3://${bucket}/${reportFilename}`,
    `aws s3 cp ${remediationReportFilename} s3://${bucket}/${remediationReportFilename}`
  ])
}

exports.handler = async (event) => {
  const reportFilename = 'compliance-report.html'
  const remediationReportFilename = 'remediation-report.html'
  const codePipelineJobId = event["CodePipeline.job"].id

  const artifact = {
    bucketName: event["CodePipeline.job"].data.inputArtifacts[0].location.s3Location.bucketName,
    objectKey: event["CodePipeline.job"].data.inputArtifacts[0].location.s3Location.objectKey,
    artifactName: event["CodePipeline.job"].data.inputArtifacts[0].name
  }

  try {
    instanceId = await runInstance()

    await EC2.waitFor('instanceRunning', {
      InstanceIds: [ instanceId ]
    }).promise()

    await waitForSsmAgentRunning(instanceId)
    await installTools(instanceId)
    await copyArtifactFromS3ToInstance(instanceId, artifact.bucketName, artifact.objectKey, artifact.artifactName)
    await complianceChecks(instanceId, reportFilename, remediationReportFilename, "ssg-rhel8-ds.xml")
    await copyReportToBucket(instanceId, reportFilename, remediationReportFilename, artifact.bucketName)
    await terminateInstance(instanceId)
    
    await CodePipeline.putJobSuccessResult({
      jobId: codePipelineJobId
    }).promise()
  } catch (err) {
    if (instanceId) {
      await terminateInstance(instanceId)
    }
    await CodePipeline.putJobFailureResult({
      jobId: codePipelineJobId,
      failureDetails: {
        message: err.message,
        type: 'JobFailed'
      }
    }).promise()
    
    return err
  }
}
