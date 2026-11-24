import type en from './locales/en';

type Source = typeof en;

/** 메시지 트리: 문자열이거나, 문자열·하위 트리를 담은 객체 */
export interface MessageTree {
  readonly [key: string]: string | MessageTree;
}

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** 모든 언어 리소스가 따라야 하는 모양. 기준 언어(en)의 값을 string으로 넓힌 것이다. */
export type Messages = Widen<Source>;

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** 'board.label', 'hint.tactic.xWing.name' 같은 점 표기 키 */
export type MessageKey = Leaves<Source>;

type Lookup<T, K extends string> = K extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? Lookup<T[Head], Rest>
    : never
  : K extends keyof T
    ? T[K]
    : never;

/**
 * 메시지 안의 {name} 파라미터 이름을 뽑는다.
 * 지원하는 문법은 `{영문·숫자·_}` 하나뿐이다. 이 타입 자체는 {…} 안의 내용을 제한하지 않으므로,
 * 형식은 i18n.test.ts의 리소스 검사 테스트로 강제한다. 복수형·선택 같은 중괄호 문법(ICU 등)을 들이거나
 * 파라미터 이름 규칙을 바꾸면 이 타입, index.ts translate()의 정규식, i18n.test.ts의 정규식을 함께 바꾼다.
 */
type ParamNames<S> =S extends `${string}{${infer P}}${infer Rest}` ? P | ParamNames<Rest> : never;

export type MessageParams = Record<string, string | number>;

/** 키에 {파라미터}가 있으면 두 번째 인자를 필수로, 없으면 받지 않는다. */
export type ParamsArg<K extends MessageKey> = [ParamNames<Lookup<Source, K>>] extends [never]
  ? []
  : [params: Record<ParamNames<Lookup<Source, K>>, string | number>];

export type Translate = <K extends MessageKey>(key: K, ...params: ParamsArg<K>) => string;
