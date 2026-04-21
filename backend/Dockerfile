FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
ENV PIP_DEFAULT_TIMEOUT=120
# Индекс PyPI: по умолчанию зеркало Tsinghua. Только официальный: docker compose build --build-arg PIP_INDEX=https://pypi.org/simple
ARG PIP_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple
RUN pip install --retries 8 --default-timeout=120 \
    -i "${PIP_INDEX}" \
    --trusted-host pypi.org --trusted-host files.pythonhosted.org \
    --trusted-host pypi.tuna.tsinghua.edu.cn \
    --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
