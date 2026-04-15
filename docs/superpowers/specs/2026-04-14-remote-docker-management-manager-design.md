# Remote Docker Management Manager 설계

날짜: 2026-04-14  
상태: 설계 검증 완료, 사용자 검토 후 구현 계획 수립 준비됨

## 1. 목표

`docker-container-api`를 실행하는 여러 원격 서버에 연결하여 컨테이너 수명 주기, 도메인 생성 및 리버스 프록시 라우팅을 한 곳에서 관리하는 중앙 관리 서버를 구축합니다.

이 제품은 다음 두 가지를 모두 포함합니다:

- 운영자를 위한 admin UI
- 자동화를 위한 API 인터페이스

v1의 범위는 의도적으로 제한되었습니다:

- admin UI와 백엔드를 포함한 전체 MVP
- 사전 정의된 컨테이너 템플릿만 지원
- 대부분 동기 방식의 생성/삭제 오케스트레이션
- Cloudflare DNS 연동
- DB 상태를 기반으로 한 전체 Caddyfile 생성
- v1에서는 앱에서 직접 Caddy 배포를 수행하지 않음
- v1에서는 E2E 테스트만 수행

## 2. 제품 범위

### v1 포함 사항

- `.env`의 자격 증명을 사용한 Admin 로그인
- 글로벌 설정(config) 관리
- 원격 서버 레지스트리 관리
- 페이징이 포함된 관리형 컨테이너 목록
- 컨테이너 생성/삭제/시작/정지/상태 확인 액션
- 도메인 제안 및 할당
- Cloudflare DNS 레코드 관리
- 현재 활성화된 컨테이너 기반 Caddyfile 재생성
- `API_KEY`로 보호되는 공개 API 접근
- 주요 운영 흐름에 대한 E2E 테스트 커버리지

### v1 제외 사항 (명시적 제외)

- 임의의 컨테이너/이미지 프로비저닝
- 기본 제어 모델로서의 백그라운드 작업/리컨실러(reconciler) 아키텍처
- 앱에서 직접 Caddy 배포 또는 원격 리로드 수행
- Unit-test-first 또는 integration-test-first 테스트 전략

## 3. 권장 아키텍처

다음을 소유하는 단일 Hono 기반 컨트롤 플레인 서비스를 사용합니다:

- admin 인증
- admin UI 백엔드
- 공개 API 엔드포인트
- 오케스트레이션 로직
- 데이터 영속성
- Cloudflare 연동
- Caddyfile 생성

### 상위 수준 경계

1. **Admin UI / API 클라이언트**가 중앙 매니저를 호출합니다.
2. **중앙 매니저**가 상태를 검증하고 작업을 오케스트레이션합니다.
3. **원격 서버**는 `docker-container-api`를 노출하고 실제 컨테이너를 실행합니다.
4. **Cloudflare**는 생성된 도메인에 대한 DNS 레코드를 관리합니다.
5. **Caddyfile 출력**은 DB 상태에서 재생성되어 디스크에 기록됩니다.

이것은 범용 컨테이너 플랫폼이 아닌 컨트롤 플레인입니다.

## 4. 기술 스택

- **백엔드**: Hono + TypeScript
- **데이터베이스**: Prisma + SQLite3
- **프론트엔드**: 로그인/설정/서버/컨테이너 관리를 위한 admin UI
- **DNS 프로바이더**: Cloudflare DNS API
- **원격 실행 대상**: `docker-container-api`
- **라우팅 설정 출력**: 생성된 Caddyfile

## 5. 데이터 모델

초기 사용자 초안에는 `config`, `servers`, `containers`가 포함되었습니다. 검증된 설계에서는 `container_templates`와 `operations`라는 두 가지 중요한 개념이 추가되었습니다.

### `config`

단일 행 글로벌 설정:

- `base_domain`
- `cloudflare_api_key`
- `cloudflare_zone_id`
- `target_cname`
- `caddyfile_path`

참고:

- `base_domain`은 컨테이너 도메인을 빌드하는 데 사용되는 접미사입니다.
- `caddyfile_path`의 기본값은 `{project_dir}/config/Caddyfile`입니다.

### `servers`

등록된 원격 노드:

- `id`
- `remote_ip`
- `api_token`
- 선택적인 헬스/상태 메타데이터

### `container_templates`

허용된 사전 정의 프로비저닝 가능 컨테이너 유형을 나타냅니다.

권장 필드:

- `id`
- `template_key`
- `display_name`
- `description`
- `enabled`
- `docker-container-api` 호출에 필요한 템플릿 메타데이터

목적:

- 시스템에서 "템플릿 전용 프로비저닝"을 명시적으로 만듭니다.
- v1에서 임의의 이미지 생성을 방지합니다.

### `containers`

매니저가 추적하는 관리형 컨테이너:

- `id`
- `server_id`
- `template_id`
- `container_id`
- `container_name`
- `api_token`
- `slug`
- `domain_name`
- `service_port`
- `status`
- 타임스탬프

참고:

- `slug`는 과일/동물/형용사 조합과 같은 의미 있는 무작위 이름 구성 요소입니다.
- `domain_name`은 `slug + "." + config.base_domain`으로 빌드됩니다.
- 여기서 `api_token`은 원격 서버 토큰과 별개인 관리형 서비스의 Hermes API 키입니다.

### `operations`

외부 오케스트레이션에 대한 감사 및 실패 가시성.

권장 필드:

- `id`
- `container_id`
- `operation_type` (`create`, `delete`, `start`, `stop`, `refresh_status`)
- `current_step`
- `status`
- `error_message`
- `started_at`
- `finished_at`

목적:

- 어떤 단계에서 실패했는지 기록합니다.
- 운영자에게 진실된 가시성을 제공합니다.
- 부분적인 외부 부수 효과가 숨겨지는 것을 방지합니다.

## 6. 상태 모델

데이터베이스는 현재 인벤토리 및 라우팅 생성의 소스 오브 트루스(Source of Truth)입니다.

### 컨테이너 수명 주기 상태

- `creating`
- `active`
- `stopping`
- `stopped`
- `deleting`
- `deleted`
- `error`

### 명시적 상태가 필요한 이유

시스템은 대부분 동기식이지만, 외부 세계는 원자적이지 않습니다. 원격 컨테이너는 생성되었지만 DNS 또는 Caddyfile 생성이 완료되기 전에 요청이 실패할 수 있습니다. 매니저는 DB에 해당 사실을 보존해야 합니다.

예시:

- 원격 컨테이너 생성됨, DNS 실패 → `error`
- DNS 제거됨, Caddyfile 생성 실패 → `error`
- 원격 정지 성공적으로 완료됨 → `stopped`

## 7. 제약 조건 및 불변성

- `containers.slug`는 유일해야 합니다.
- `containers.domain_name`은 유일해야 합니다.
- 원격 생성 후 `containers.server_id + container_id`는 유일해야 합니다.
- 비밀 정보(secrets)는 역할별로 분리되어야 합니다.
- Caddyfile 생성은 증분 파일 패칭이 아닌 DB 상태를 기반으로 해야 합니다.

## 8. 오케스트레이션 규칙

### 생성(Create) 흐름

권장 순서:

1. 글로벌 설정, 대상 서버 및 선택된 템플릿을 검증합니다.
2. DB에서 `status=creating`으로 고유한 slug와 도메인을 예약합니다.
3. 원격 `docker-container-api`를 호출하여 컨테이너를 생성합니다.
4. 원격 `container_id`, `service_port` 및 Hermes `api_token`을 유지합니다.
5. Cloudflare DNS 레코드를 생성하거나 업데이트합니다.
6. 활성화된 모든 라우팅 가능 컨테이너로부터 전체 Caddyfile을 재생성합니다.
7. `status=active` 상태를 저장합니다.

### 삭제(Delete) 흐름

권장 순서:

1. `status=deleting`으로 표시합니다.
2. 원격 컨테이너를 삭제합니다.
3. Cloudflare DNS 레코드를 삭제합니다.
4. 전체 Caddyfile을 재생성합니다.
5. 보존 정책에 따라 `status=deleted`로 유지하거나 완전 삭제(hard-delete)합니다.

### 시작 / 정지 / 상태 확인 흐름

- **Start**: 원격 컨테이너를 시작한 후 DB 상태를 갱신합니다.
- **Stop**: 원격 컨테이너를 정지한 후 DB 상태를 갱신합니다.
- **Refresh Status**: 원격 상태를 폴링하여 로컬 상태를 업데이트합니다.

이 작업들은 라우팅 관련 값들이 변경되지 않는 한 DNS나 Caddyfile을 수정하지 않습니다.

## 9. 실패 처리 모델

매니저는 외부 작업을 원자적인 것이 아니라 단계적인 것으로 취급해야 합니다.

이전 단계가 성공한 후 작업이 실패한 경우:

- 컨테이너 행을 유지합니다.
- 레코드를 `error`로 표시합니다.
- 마지막으로 성공한 단계를 `operations`에 기록합니다.
- UI와 API에서 실패를 명확하게 노출합니다.

시스템은 명확하고 추적 가능하게 실패해야 합니다. 불완전한 생성/삭제 흐름을 묵묵히 넘겨서는 안 됩니다.

## 10. Admin UI 화면

### 로그인

- `.env`의 admin ID/password 사용
- 브라우저 접근을 위한 세션 기반 인증

### 설정(Config) 페이지

필드:

- base domain
- Cloudflare API key
- Cloudflare zone ID
- target CNAME
- Caddyfile path

### 서버(Servers) 페이지

기능:

- 서버 추가
- 서버 편집
- 서버 제거
- 연결 테스트 / 상태 표시

### 컨테이너(Containers) 페이지

다음을 보여주는 페이징 목록:

- 도메인 이름
- slug
- 서버
- 템플릿
- 상태
- 서비스 포트
- 원격 컨테이너 ID
- 생성 시간

액션:

- 생성 (Create)
- 삭제 (Delete)
- 시작 (Start)
- 정지 (Stop)
- 상태 갱신 (Refresh Status)

### 생성 UX 규칙

프론트엔드는 최종 확정 전에 서버에서 생성된 도메인 제안 미리보기를 요청해야 합니다. slug 생성은 백엔드에서 중앙 집중식으로 관리됩니다.

## 11. API 인터페이스

시스템은 또한 자동화를 위한 API를 노출하며, `.env`의 `API_KEY`로 보호됩니다.

권장 라우트 구성:

- `POST /admin/login`
- `POST /admin/logout`
- `GET /admin/session`
- `GET /api/config`
- `PUT /api/config`
- `GET /api/servers`
- `POST /api/servers`
- `PUT /api/servers/:id`
- `DELETE /api/servers/:id`
- `GET /api/containers`
- `POST /api/containers`
- `POST /api/containers/:id/start`
- `POST /api/containers/:id/stop`
- `POST /api/containers/:id/refresh`
- `DELETE /api/containers/:id`

## 12. Caddyfile 생성

라우팅 출력은 활성 컨테이너 인벤토리를 사용하여 DB 상태로부터 생성됩니다.

예시 대상 형식:

```caddy
red-apple.safe-agent.cloud {
    reverse_proxy http://{IP_ADDRESS}:{API_PORT}
}
```

이 시스템에서:

- `domain_name`은 host 블록에 매핑됩니다.
- `servers.remote_ip`는 `{IP_ADDRESS}`에 매핑됩니다.
- `containers.service_port`는 `{API_PORT}`에 매핑됩니다.

### v1 범위

- 앱은 전체 Caddyfile 내용을 다시 씁니다.
- 앱은 설정된 파일 경로에 이를 기록합니다.
- 앱은 v1에서 Caddy를 직접 배포/리로드하지 **않습니다**.
- Ansible과 같은 외부 운영 도구가 나중에 생성된 파일을 소비할 수 있습니다.

## 13. Cloudflare DNS 동작

매니저는 다음을 사용합니다:

- `config.base_domain`
- `config.cloudflare_api_key`
- `config.cloudflare_zone_id`
- `config.target_cname`

각 활성 컨테이너 도메인에 대해, 시스템은 생성된 호스트 이름이 설정된 타겟을 통해 확인되도록 필요한 Cloudflare DNS 레코드를 생성합니다.

생성/삭제 흐름은 Cloudflare를 관리형 컨테이너 수명 주기와 동기화된 상태로 유지해야 합니다.

## 14. 보안 경계

세 가지 인증 도메인은 분리되어 유지되어야 합니다:

1. UI를 위한 **Admin 브라우저 인증**
2. 자동화 클라이언트를 위한 **API key 인증**
3. 각 `docker-container-api` 호출을 위한 **서버별 원격 API 토큰**

추가 규칙:

- 원시 비밀 정보(raw secrets)는 저장 후 UI나 목록 API에 다시 노출되지 않아야 합니다.
- 전체 비밀 값을 왕복시키는 것보다 마스킹된 표시와 명시적인 교체 방식이 더 안전합니다.

## 15. 검증 규칙

- 생성/삭제가 허용되기 전에 설정(config)이 완료되어야 합니다.
- 서버 등록 시 원격 연결 확인이 포함되어야 합니다.
- 컨테이너 생성은 알려진 사전 정의 템플릿만 허용해야 합니다.
- 생성된 slug/도메인 충돌은 프로비저닝 전에 확인되어야 합니다.
- Cloudflare 및 원격 API 오류는 운영자가 이해할 수 있는 명확한 실패로 정규화되어야 합니다.

## 16. 테스트 전략

v1은 **E2E 테스트만** 사용합니다.

E2E 스위트는 다음을 포함해야 합니다:

- admin 로그인
- 설정 저장
- 서버 추가/편집/삭제
- 페이징된 컨테이너 목록
- 도메인 제안 미리보기
- 컨테이너 생성
- 컨테이너 삭제
- 컨테이너 시작
- 컨테이너 정지
- 상태 갱신
- 잘못된 설정 동작
- 도달할 수 없는 원격 서버 동작
- Cloudflare 실패 동작
- 원격 생성 실패 동작
- UI/API에서의 부분 실패 가시성

v1에는 별도의 단위 또는 통합 계층이 없으므로, E2E 스위트가 주요 실행 가능 검증 계층이 됩니다.

## 17. 구현 방향

이 설계는 구현 계획으로 전환될 준비가 되었습니다.

권장 구현 순서:

1. 프로젝트 스캐폴드 및 런타임 구조
2. Prisma 스키마 및 마이그레이션
3. admin 인증 및 세션 처리
4. 설정/서버/템플릿/컨테이너 CRUD API
5. 원격 API + Cloudflare + Caddyfile 생성을 위한 오케스트레이션 서비스
6. admin UI 화면
7. E2E 테스트 스위트

## 18. 이미 해결된 결정 사항

설계 과정에서 다음 제품 결정 사항들이 명시적으로 검증되었습니다:

- 백엔드 전용이 아닌 **전체 MVP** 구축
- v1에서는 **사전 정의된 템플릿만** 허용
- **대부분 동기식**인 오케스트레이션 모델 사용
- v1에서는 **Caddyfile만 생성**하며, 배포는 외부에서 수행
- v1에서는 **E2E 테스트만** 사용

## 19. 요약

v1 시스템은 원격의 템플릿 기반 컨테이너 프로비저닝을 위한 중앙 집중식 컨트롤 플레인입니다. DB를 소스 오브 트루스로 취급하고, UI와 API 인터페이스를 모두 노출하며, Cloudflare DNS 및 생성된 Caddy 라우팅을 동기화하고, 외부 작업이 원자적이라고 가정하는 대신 부분적 실패를 명시적으로 기록합니다.
