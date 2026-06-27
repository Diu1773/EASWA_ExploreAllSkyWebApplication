# Manuscript-Ready Validation Statistics

이 문서는 EASWA 논문에서 결과 검증 또는 시스템 신뢰도 검증 표로 사용할 수 있는 통계 항목을 정리한다.

## 1. 대상/자료 구성 통계

| 항목 | 표기 예 | 용도 |
| --- | --- | --- |
| 분석 대상 수 | `N_targets` | 플랫폼이 제공한 탐구 표본 규모 |
| 관측 sector/epoch 수 | `N_sectors`, `N_observations` | 자료 범위 |
| 사용 프레임 수 | `N_frames` | 측광에 실제 사용된 자료량 |
| 적합 사용 점 수 | `N_fit` | 모델 적합 표본 크기 |
| sigma clipping 제외 비율 | `N_clip / (N_fit + N_clip)` | 전처리 강도와 이상치 영향 |

권장 보고: target별 값과 전체 median, IQR, min, max를 함께 제시한다.

## 2. 측광 품질 통계

| 항목 | 산식/정의 | 용도 |
| --- | --- | --- |
| 비교성별 RMS | comparison differential light curve의 RMS | 비교성 안정도 |
| 비교성별 MAD | `median(|x - median(x)|)` | RMS보다 이상치에 둔감한 품질 지표 |
| ensemble effective count | `1 / sum(w_i^2)` with normalized weights | 비교성 가중치가 한 별에 쏠렸는지 확인 |
| target/comparison median flux | aperture photometry median flux | 포화/저신호 가능성 설명 |

권장 보고: retained comparison count, median comparison RMS, maximum comparison RMS, effective comparison count.

## 3. 모델 적합 품질 통계

| 항목 | 산식/정의 | 용도 |
| --- | --- | --- |
| residual mean | `mean(data_flux - model_flux)` | 체계적 편향 확인 |
| residual RMS | `sqrt(mean(residual^2))` | 모델-자료 차이의 대표 크기 |
| residual MAD | `median(|residual - median(residual)|)` | 이상치에 둔감한 잔차 크기 |
| residual 95th percentile | `P95(|residual|)` | 큰 잔차 꼬리 확인 |
| normalized residual RMS | `sqrt(mean((residual / error)^2))` | 오차 추정이 적절한지 확인 |
| reduced chi-squared | `chi2 / dof` | 모델 적합도 진단 |

권장 단위: normalized flux 잔차는 `ppm`, magnitude 잔차는 `mmag`.

## 4. 문헌값/카탈로그값 비교 통계

| 항목 | 산식/정의 | 용도 |
| --- | --- | --- |
| measured transit depth | `(Rp/R*)^2 * 100` | 관측 식 깊이 |
| reference Rp/R* estimate | `sqrt(reference_depth_pct / 100)` | 카탈로그 식 깊이 기반 비교 기준 |
| depth difference | `measured_depth_pct - reference_depth_pct` | 기준값 대비 식 깊이 차이 |
| relative depth difference | `(measured - reference) / reference * 100` | 대상 간 비교 가능한 차이 |
| Rp/R* difference | `measured_Rp/R* - reference_Rp/R*` | 반지름비 비교 |
| period difference | `measured_period - reference_period` | 주기/위상 설정 검증 |

주의: 현재 reference Rp/R*는 catalog depth에서 유도한 비교 기준이다. 직접 출판된 반지름비와 동일한 값이라고 쓰면 안 된다.

## 5. 논문 표 권장 형식

### Target-Level Validation Table

| Target | Sector | N frames | N fit | Clip % | Comp. RMS median (ppm) | Residual RMS (ppm) | chi2_red | Depth ref (%) | Depth measured (%) | Delta depth (%p) | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |

### Aggregate Validation Table

| Metric | Median | IQR | Min | Max |
| --- | ---: | ---: | ---: | ---: |
| N fit | | | | |
| Clip % | | | | |
| Comparison RMS median (ppm) | | | | |
| Residual RMS (ppm) | | | | |
| chi2_red | | | | |
| Absolute depth difference (%p) | | | | |

## 6. Methods 문장 예시

> For each completed transit analysis, EASWA stored the selected sector, aperture configuration, comparison-star diagnostics, model settings, retained sample count, sigma-clipping count, fitted transit parameters, and residual diagnostics. Model quality was summarized using residual RMS, residual MAD, normalized residual RMS, and reduced chi-squared. Agreement with reference catalog values was evaluated using the difference between the fitted transit depth, computed as `(Rp/R*)^2`, and the catalog transit depth.

## 7. 현재 앱에서 자동 저장되는 항목

`record.context.validation_stats`에 다음 묶음이 저장된다.

- `sample`: fitted data count, retained/clipped count, clipping fraction, degrees of freedom
- `residuals`: mean, median, RMS, sample standard deviation, MAD, P95 absolute residual, normalized RMS, median flux error
- `fit`: chi-squared, reduced chi-squared, model engine, fit mode, baseline/sigma-clip settings
- `referenceComparison`: measured/reference depth, Rp/R*, period difference
- `comparisonQuality`: comparison count, median/max RMS, median MAD, max weight, effective comparison count
- `flags`: 해석 주의 자동 플래그
