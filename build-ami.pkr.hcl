variable "bucket" {
  type = string
}

variable "instance-profile" {
  type = string
}

variable "ami-id" {
  type = string
}

variable "ds-name" {
  type = string
}

packer {
  required_plugins {
    amazon = {
      version = ">= 0.0.1"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

source "amazon-ebs" "rhel8" {
  ami_name      = "ami-factory-rhel8-{{timestamp}}"
  instance_type = "t2.medium"
  iam_instance_profile = "${var.instance-profile}"
  source_ami    = "${var.ami-id}"
  ssh_username  = "ec2-user"
}

build {
  sources = ["source.amazon-ebs.rhel8"]

  provisioner "shell" {
    inline = [
      "sudo yum install -y openscap-scanner unzip",
      "curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o awscliv2.zip",
      "unzip awscliv2.zip",
      "sudo ./aws/install",

      "aws s3 cp s3://${var.bucket}/${var.ds-name} ${var.ds-name}",
      "sudo oscap xccdf eval --profile standard --report report-compliance.html ${var.ds-name} || true",
      "sudo oscap xccdf eval --profile standard --remediate --report report-remediation.html ${var.ds-name} || true",

      "aws s3 cp report-compliance.html s3://${var.bucket}/report-compliance.html",
      "aws s3 cp report-remediation.html s3://${var.bucket}/report-remediation.html"
    ]
  }
}
