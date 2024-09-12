import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as fs from "fs";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
const Port = cdk.aws_ec2.Port;

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new cdk.aws_ec2.Vpc(this, `${id}-vpc`);

    const role = new cdk.aws_iam.Role(
      this,
      `${id}-role`, // this is a unique id that will represent this resource in a Cloudformation template
      { assumedBy: new cdk.aws_iam.ServicePrincipal("ec2.amazonaws.com") }
    );

    const securityGroup = new cdk.aws_ec2.SecurityGroup(
      this,
      `${id}-security-group`,
      {
        vpc,
        allowAllOutbound: true,
        securityGroupName: `${id}-security-group`,
      }
    );

    const anyIP = cdk.aws_ec2.Peer.anyIpv4();
    const serverIp = cdk.aws_ec2.Peer.ipv4(
      `${process.env.SERVER_PUBLIC_IP}/32`
    );

    const outboundPorts: Array<
      [
        cdk.aws_ec2.IPeer,
        cdk.aws_ec2.Protocol,
        number | string | [number | string, number | string]
      ]
    > = [
      [serverIp, cdk.aws_ec2.Protocol.TCP, 22],
      [anyIP, cdk.aws_ec2.Protocol.UDP, process.env.FACTORIO_PORT!],
      [anyIP, cdk.aws_ec2.Protocol.TCP, process.env.FRPC_PORT!],
    ];

    outboundPorts.map(([peer, protocol, port]) => {
      port = Array.isArray(port) ? port : [port, port];

      let stringRepresentation = port[0];
      if (port[0] !== port[1]) {
        stringRepresentation = port.join("-");
      }
      stringRepresentation = String(stringRepresentation);

      securityGroup.addIngressRule(
        peer,
        new cdk.aws_ec2.Port({
          protocol,
          fromPort: Number([port].flat()[0]),
          toPort: Number([port].flat()[1] || [port].flat()[0]),
          stringRepresentation,
        })
      );
    });

    const s3Asset = new cdk.aws_s3_assets.Asset(this, "SampleSingleFileAsset", {
      path: "./assets/frps.toml",
    });

    // prepare the file as an asset and put it in the cfinit
    const initData = cdk.aws_ec2.CloudFormationInit.fromElements(
      cdk.aws_ec2.InitFile.fromExistingAsset("/etc/frp/frps.toml", s3Asset, {})
    );

    const instance = new cdk.aws_ec2.Instance(this, `${id}-ec2`, {
      vpc: vpc,
      vpcSubnets: {
        subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
      },
      role: role,
      securityGroup: securityGroup,
      instanceName: `${id}-ec2-instance`,
      instanceType: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.T2,
        cdk.aws_ec2.InstanceSize.MICRO
      ),
      machineImage: cdk.aws_ec2.MachineImage.latestAmazonLinux2(),
      init: initData,
      keyName: `factorio-server`,
    });

    instance.addUserData(fs.readFileSync("./lib/setup.sh", "utf-8"));

    new cdk.CfnOutput(this, `${id}-output-ip`, {
      value: instance.instancePublicIp,
      description: "Public ip of ec2 instance",
      exportName: "ec2-public-ip",
    });
  }
}
