# AMI Factory
A pipeline that creates hardened AWS AMIs based on compliance rules and remediation scripts.  
This project provides a pipeline that automatically:
- Compiles a set of compliance rules and remediation scripts.
- Generates a human-readable hardening guide and uploads it to a S3 bucket.
- Starts an user-defined AMI, executes the compliance checks, and remediates the AMI.
- Generates an human-readable report of the compliance checks and the remediations and uploads them to a S3 bucket.
- Create a new hardened AMI.

The pipeline is automatically deployed using CloudFormation.  
It uses the following AWS services:
- CloudFormation (deploys all the resources).
- CodeCommit (hosts the set of compliance rules and remediation scripts).
- CodeBuild (builds the set of compliance rules and remediation scripts).
- CodePipeline (provides the automation pipeline).
- Lambda (run EC2 instances, executes scripts, builds AMI, etc.).

## Deployment on AWS
Before deploying the stack, a S3 bucket that will store the packaged template.
Package the project:
```
aws cloudformation package --template-file template.yaml --s3-bucket <s3-bucket> --output-template-file packaged-template.yaml
```

Then, deploy the stack:
```
aws cloudformation deploy --template-file packaged-template.yaml --stack-name <stack-name> --parameter-overrides CodeCommitRepositoryName=<codecommit-repo> BucketName=<bucket-name> AmiId=<ami-id> --capabilities CAPABILITY_IAM
```

### Stack parameters
- `CodeCommitRepositoryName` - The name of the CodeCommitRepository that holds the SCAP content.
- `BucketName` - The bucket name in which the reports will be uploaded.
- `AmiId` - The ID of the AMI that will be used as base (must be a RHEL-based AMI).

## Compliance rules and remediation
Compliance rules are written using SCAP (Security Content Automation Protocol):  
https://csrc.nist.gov/projects/security-content-automation-protocol

Remediation scripts are written in Bash and are embedded into SCAP files.

Compliance rules and remediation are sourced from the SCAP Security Guide:  
(https://www.open-scap.org/security-policies/scap-security-guide/).
It provides a set of compliance rules for a variety of systems and a build pipeline.

## AWS Services

### CodeCommit
The CodeCommit repository holds the SCAP content.  
It triggers the pipeline on every commit through CodePipeline.

### CodeBuild
CodeBuild is responsible of building the SCAP content in a Docker container.  
It retreives the SCAP content from the CodeCommit repository.  
It uploads the built packaged and the human-readable hardening guides to a S3 bucket.

### CodePipeline
Defines the automation pipeline that is responsible of executing the compliance checks, remediation scripts, building the hardened AMI, etc.  
It relies on AWS Lambda functions to provision EC2 instances, execute scripts, etc.

## Limitations and improvements
- Only support for RHEL8.
- An AMI with the `oscap` package installed must be prepared before deploying the stack.
- The hardening AMI is not actually created (working on it).
- The Lambda function should be broken into multiple Lambdas.
- Based on a very old version of the SCAP Security Guide.
