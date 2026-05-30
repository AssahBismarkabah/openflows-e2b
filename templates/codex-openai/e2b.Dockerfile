# E2B template for running OpenFlows with Codex CLI + direct OpenAI.
#
# Build context is prepared by scripts/prepare-context.sh:
#   .build/context/
#    openflows/
#    e2b-config/
#    e2b.Dockerfile

FROM rust:1.88-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV OPENFLOWS_HOME=/opt/openflows
ENV OPENFLOWS_E2B_HOME=/opt/e2b-config
ENV CARGO_TERM_COLOR=always

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    jq \
    nodejs \
    npm \
    patch \
    pkg-config \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g @openai/codex

WORKDIR /opt

COPY openflows /opt/openflows
COPY e2b-config /opt/e2b-config

WORKDIR /opt/openflows

RUN test -f binary/src/bin/agentflow.rs \
    && patch -p0 < /opt/e2b-config/patches/agentflow-openai-startup-guard.patch
RUN cp /opt/e2b-config/config/registry.codex-openai.json /opt/openflows/orchestration/agent/registry.json

RUN cargo build --release -p openflows --bin agentflow --bin agentflow-setup --bin agentflow-dashboard --bin agentflow-doctor

RUN chmod +x /opt/e2b-config/scripts/*.sh

ENV DEFAULT_CLI=codex
ENV CODEX_PROVIDER=openai
ENV CODEX_PATH=codex
ENV RUST_LOG=info

CMD ["/bin/bash"]
