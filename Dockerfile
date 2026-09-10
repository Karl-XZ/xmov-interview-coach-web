FROM modelscope-registry.cn-beijing.cr.aliyuncs.com/modelscope-repo/python:3.10

WORKDIR /home/user/app
COPY ./ /home/user/app

ENV HOST=0.0.0.0
ENV PORT=7860
EXPOSE 7860

ENTRYPOINT ["python", "-u", "app.py"]
