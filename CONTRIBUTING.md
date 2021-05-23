# Contributing

You cannot push directly to the `master` branch as it represents the stable version of the project.
To contribute, you must create a branch for a specific modification, then create a pull request.
Once the pull request has been reviewed, it can be merged to `master`

## Pull Request Process

1. Create a branch for a specific modification (ex. `feature/dummy`).
2. Implement your modifications
3. Test the project by deploying the stack from your local machine.  
You must choose a unique stack name to avoid any conflict (ex. `ami-factory-dummy`).  
See the [README.md](https://github.com/capgemini-pnc/ami-factory/blob/master/README.md) to know how to deploy the stack.
5. Go to CodePipeline to check if the pipeline works properly.
6. Once your done, go open a new pull request.
7. Wait for your pull request to be reviewed, then merge it to `master`.

**Do not forget to destroy your testing stack and delete your branch once your pull request has been merged.**

## Testing the Pipeline

When deploying a new stack, you must allow the OAuth connection between CodePipeline and GitHub (for CodePipeline to be authorized to clone the repo).
To do so, follow [this section](#allow-github-connection-in-codepipeline)

The pipeline is considered working if:
- All the steps in CodePipeline works properly.
- A new hardened AMI is created.
- An HTML hardening guide is generated and uploaded to S3.
- An HTML compliance report is generated and uploaded to S3.
- An HTML remediation report is generated and uploaded to S3.

## Project Architecture

```
├── README.md
├── aws-lambda
│   └── compliance-check.js   Lambda that build the hardened AMI.
├── buildspec.yml             CodeBuild build specifications
├── cloudformation            Contains all the CloudFormation templates
│   ├── codebuild.yaml
│   ├── codepipeline.yaml
│   └── lambda.yaml
├── doc                       Contains images for the documentation
└── template.yaml             CloudFormation main template
```

## Allow GitHub Connection in CodePipeline

First deploy your stack, then go to the AWS Console, in the CodePipeline service.

![](https://github.com/capgemini-pnc/ami-factory/blob/3557eef287109ff8b2120523264a732d3ecd8192/doc/codepipeline-github-connection.png)

Select the GitHub connection associated to your stack, then click "Update pending connection".

A popup appears, select `capgemini-pnc` in the dropdown menu, then click "Connect".

![](https://github.com/capgemini-pnc/ami-factory/blob/2e9e16dfd1586c6b9cb1531ed4498d207cf682fb/doc/codepipeline-github-app.png)
