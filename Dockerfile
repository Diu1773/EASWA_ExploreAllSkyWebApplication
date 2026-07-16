FROM node:20-bookworm AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Vite bakes VITE_* vars into the bundle at build time, so they must be present
# HERE — a Render dashboard env var alone is runtime-only and would silently
# produce a build with the anonymous-submit button stuck on "제출 서버 미설정".
# Render translates service env vars into build args, so declaring the ARG is
# what actually wires the dashboard value through. Not secrets: both values ship
# to the browser in the bundle regardless.
ARG VITE_RECORD_SINK_URL=""
ARG VITE_APP_VERSION="dev"
ENV VITE_RECORD_SINK_URL=$VITE_RECORD_SINK_URL \
    VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run build


FROM python:3.12-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    EASWA_HOST=0.0.0.0

WORKDIR /app/backend

COPY backend/requirements.txt /app/backend/requirements.txt
# Install numpy first so its headers are available when batman-package
# compiles its C extension. Then install the rest of the requirements.
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir setuptools \
    && pip install --no-cache-dir numpy \
    && pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# The WASP-6 b practice cutout is committed under backend/bundled_cutouts/, so it
# is copied into the image above and this step is a no-op for it (no runtime MAST
# dependency, survives Render spin-downs). If any *additional* demo cutout is
# added later and cannot be fetched, this FAILS the build instead of silently
# shipping it missing.
RUN python scripts/fetch_bundled_cutouts.py

EXPOSE 5895

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-5895}"]
