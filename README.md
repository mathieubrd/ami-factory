# AMI Factory
A pipeline that creates hardened AWS AMIs based on compliance rules and remediation scripts written with SCAP.  
This project provides a pipeline that automatically:
- Compiles a set of compliance rules and remediation scripts using SCAP.
- Generates a human-readable hardening guide and uploads it to a S3 bucket.
- Starts an user-defined AMI, executes the compliance checks, and remediates the AMI.
- Generates an human-readable report of the compliance checks and the remediations and uploads them to a S3 bucket.
- Create a new hardened AMI.

The pipeline is automatically deployed using CloudFormation.  
It uses the following AWS services:
- CloudFormation to deploys all the resources.
- CodeBuild to builds the set of compliance rules, remediation scripts, and build the hardened AMI using Packer.
- CodePipeline which provides the automation pipeline.
- EC2 to build the AMI (run by Packer).

The SCAP content is hosted in another GitHub repository called [ami-factory-scap](https://github.com/capgemini-pnc/ami-factory-scap).

## Deployment on AWS
Before deploying the stack, first create a S3 bucket that will store SCAP content and CloudFormation packaged templates.
Package the project:
```
aws cloudformation package --template-file template.yaml --s3-bucket capgemini-pnc.ami-factory --output-template-file packaged-template.yaml
```

Then, deploy the stack:
```
aws cloudformation deploy --template-file packaged-template.yaml --stack-name <stack-name> --parameter-overrides GitHubRepository=capgemini-pnc/ami-factory ScapGitHubRepository=capgemini-pnc/ami-factory-scap BucketName=capgemini-pnc.ami-factory AmiId=ami-032e5b6af8a711f30 --capabilities CAPABILITY_NAMED_IAM
```

### Stack parameters
- `GitHubRepository` - The full name (includinf the organisation name) of the GitHub repository that contains the project.
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

### CodeBuild
CodeBuild is responsible of building the SCAP content and the hardening AMI in a Docker container. 
CodeBuild does the following steps:
- Retreives the SCAP content from the CodeCommit repository.  
- Uploads the built packaged and the human-readable hardening guides to a S3 bucket.
- Launch Packer that builds the hardening AMI by using the previous built SCAP package.

### CodePipeline
Defines the automation pipeline that is responsible of retreiving the source code from GitHub, start CodeBuild and upload artifacts.

## Limitations and improvements
- Only support for RHEL8.
- Based on a very old version of the SCAP Security Guide.
