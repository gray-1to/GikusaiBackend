import aws_cdk as core
import aws_cdk.assertions as assertions

from gikusai_2024_10_29.gikusai_2024_10_29_stack import Gikusai20241029Stack

# example tests. To run these tests, uncomment this file along with the example
# resource in gikusai_2024_10_29/gikusai_2024_10_29_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = Gikusai20241029Stack(app, "gikusai-2024-10-29")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
