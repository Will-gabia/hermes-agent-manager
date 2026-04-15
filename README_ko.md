# Hermes Agent Manager (에이전트 매니저)

여러 원격 노드에 걸쳐 원격 Docker 에이전트 컨테이너를 프로비저닝하고 관리하기 위한 원격 Docker 관리 매니저입니다.

## 주요 기능

- **현대적인 관리자 대시보드**: 에이전트, 서버 및 템플릿 관리를 위한 그리드 기반의 반응형 UI.
- **에이전트 수명 주기 관리**: 원격 에이전트의 생성(Provision), 시작, 정지, 삭제 및 상태 동기화.
- **원격 노드 레지스트리**: 용량 추적(현재/최대 에이전트 수) 기능이 포함된 다중 원격 서버 관리.
- **템플릿 시스템**: 키워드 기반(예: `default`) 템플릿 관리 및 JSON 메타데이터 지원.
- **DNS 자동화**: 에이전트 수명 주기에 맞춰 자동으로 동기화되는 Cloudflare DNS 레코드 관리.
- **동적 라우팅**: 자동 Caddyfile 생성 및 로드 밸런서 동기화를 위한 보안 다운로드 API 제공.
- **검색 및 필터링**: 도메인별 실시간 에이전트 검색 및 감사를 위한 "삭제된 항목 보기" 필터.
- **API 우선 설계**: `X-API-KEY`로 보호되는 전체 REST API 및 OpenAPI 3.0 명세 제공.

## 사전 요구 사항

- Node.js v20+
- SQLite3 (Prisma를 통해 관리됨)
- `docker-container-api`가 실행 중인 원격 서버

## 시작하기

1. **의존성 설치:**
   ```bash
   npm install
   ```

2. **환경 설정:**
   `.env.example` 파일을 `.env`로 복사하고 필요한 값(관리자 자격 증명, API 키 등)을 입력합니다.
   ```bash
   cp .env.example .env
   ```

3. **데이터베이스 설정:**
   ```bash
   npx prisma migrate dev
   npx tsx prisma/seed.ts
   ```

4. **개발 서버 실행:**
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:3000/admin-ui`에 접속합니다.

## 기술 스택

- **Backend**: Hono (Node.js)
- **ORM**: Prisma + SQLite3
- **Frontend**: Vanilla JS + Pico.css (커스텀 현대적 대시보드)
- **Documentation**: OpenAPI 3.0 (YAML)
- **Testing**: Vitest + Supertest

## API 및 연동

### API 문서
관리자 UI에서 직접 OpenAPI 명세를 다운로드하거나 `/openapi.yaml` 경로에서 확인할 수 있습니다.

### Caddyfile 동기화
로드 밸런서는 다음 명령어를 통해 최신 라우팅 설정을 가져올 수 있습니다:
```bash
curl -H "X-API-KEY: {your-api-key}" http://{manager-ip}:3000/api/caddy/download -o Caddyfile
```

## 라이선스

ISC
