import { Component } from 'react'
import type { ReactNode } from 'react'
import { BTN_PRIMARY, BTN_SECONDARY, MODAL_SHELL } from './classes'

interface Props {
  children: ReactNode
  /** 이 값이 바뀌면 울타리를 푼다 — 화면을 옮겼는데도 안내가 남아 있으면 그 자리에 갇힌다 */
  resetKey?: string
}

interface State {
  error: Error | null
  /** 마지막으로 본 resetKey — 바뀌었는지 알려면 들고 있어야 한다 */
  resetKey?: string
}

/**
 * 한 화면이 그려지다 죽어도 앱이 통째로 사라지지 않게 막는 울타리.
 * React 는 잡히지 않은 오류를 만나면 화면 트리를 전부 걷어내므로, 울타리가 없으면 빈 화면만 남는다.
 * 그 뒤로는 주소만 바뀌는 뒤로 가기로도 돌아올 수 없어(그릴 것이 남아 있지 않다) 새로고침이 유일한 회복 경로가 된다.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Pick<State, 'error'> {
    return { error }
  }

  /** 그리기 직전에 견주므로 화면을 옮긴 그 렌더에서 바로 풀린다(그린 뒤에 풀면 안내가 한 번 더 그려진다) */
  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (props.resetKey === state.resetKey) return null
    return { error: null, resetKey: props.resetKey }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (error === null) return this.props.children

    return (
      <main className="app-bg grid h-full place-items-center px-5 text-ink">
        <div className={`panel-in w-full max-w-[420px] px-7 py-9 text-center ${MODAL_SHELL}`}>
          <p className="text-[15px] font-semibold text-ink">화면을 여는 중 문제가 생겼습니다</p>
          <p className="mt-2 text-[12.5px] leading-6 text-ink-3">
            같은 화면을 다시 열거나, 문제가 이어지면 새로고침해 주세요.
          </p>
          {/* 무엇이 잘못됐는지 알려야 그대로 옮겨 적어 알릴 수 있다 — 내부망에서 쓰는 화면이라 원문을 감추지 않는다 */}
          {error.message && (
            <p className="mt-4 break-words rounded-ctl border border-line-soft bg-soft px-3 py-2 text-left text-[11.5px] leading-5 text-ink-3">
              {error.message}
            </p>
          )}
          <div className="mt-6 flex gap-2">
            <button type="button" className={`${BTN_PRIMARY} flex-1`} onClick={this.reset}>
              다시 시도
            </button>
            <button type="button" className={`${BTN_SECONDARY} flex-1`} onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        </div>
      </main>
    )
  }
}
