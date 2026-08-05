import { useEffect, useRef, useState } from 'react'

const MISSING = '필수 항목을 입력해 주세요.'
const INVALID = '입력값을 확인해 주세요.'

/** 채우지 않은 칸을 붉게 물들이는 표시 — 값을 고칠 때까지 남는다(규칙은 index.css) */
const SHOW_INVALID = 'show-invalid'
/** 흔들림 표시 — 제출을 누른 순간에만 잠깐 붙는다 */
const SHAKE = 'shake-invalid'
/** 흔들림이 끝나는 시각(ms). index.css 의 field-shake 보다 넉넉히 잡는다 */
const SHAKE_MS = 420

/**
 * 제출을 눌렀을 때 채우지 않은 칸을 화면 안에서 알린다.
 * 브라우저 기본 말풍선은 우리 규격 밖에서 그려지고 한 번에 한 칸만 짚어 주므로 쓰지 않는다(폼은 noValidate).
 * 대신 못 채운 칸을 모두 붉게 흔들고, 버튼 옆에 사유를 한 줄 세운다.
 */
export function useFormNotice() {
  const formRef = useRef<HTMLFormElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const shakeTimer = useRef(0)
  /**
   * 지금 띄운 문구가 어디서 왔는지.
   * 브라우저가 판정한 것(native)은 값을 고치면 저절로 거둘 수 있지만,
   * 우리가 세운 것(custom)은 브라우저가 그 조건을 모르므로 고쳐졌는지도 알 수 없어 그대로 둔다.
   */
  const source = useRef<'native' | 'custom'>('native')

  function clear() {
    setNotice(null)
    formRef.current?.classList.remove(SHOW_INVALID)
  }

  /** 한 번만 흔든다 — 표시를 뗐다 붙이는 사이에 화면을 다시 재게 해야 처음부터 다시 돌고, 끝나면 도로 뗀다 */
  function shake(form: HTMLFormElement) {
    window.clearTimeout(shakeTimer.current)
    form.classList.remove(SHAKE)
    void form.offsetWidth
    form.classList.add(SHAKE)
    shakeTimer.current = window.setTimeout(() => form.classList.remove(SHAKE), SHAKE_MS)
  }

  /** 폼이 성립하면 true. 아니면 못 채운 칸을 표시하고 사유를 세운 뒤 false */
  function validate(): boolean {
    const form = formRef.current
    if (!form || form.checkValidity()) {
      clear()
      return true
    }
    const invalid = Array.from(form.querySelectorAll<HTMLInputElement>(':invalid'))
    source.current = 'native'
    setNotice(invalid.some((el) => el.validity.valueMissing) ? MISSING : INVALID)
    form.classList.add(SHOW_INVALID)
    shake(form)
    invalid[0]?.focus()
    return false
  }

  /** 브라우저가 알 수 없는 문제(파일 오류·변환 실패)를 같은 자리에 알린다 */
  function fail(message: string) {
    source.current = 'custom'
    setNotice(message)
  }

  useEffect(() => () => window.clearTimeout(shakeTimer.current), [])

  // 값을 고치는 동안 문구를 거둔다 — 다 채웠는데도 남아 있으면 잘못을 알리는 것이 아니라 잔소리가 된다
  useEffect(() => {
    const form = formRef.current
    if (!form || notice === null || source.current === 'custom') return
    const recheck = () => {
      if (form.checkValidity()) clear()
    }
    form.addEventListener('input', recheck)
    form.addEventListener('change', recheck) // 고르는 칸은 input 을 내지 않는 브라우저가 있다
    return () => {
      form.removeEventListener('input', recheck)
      form.removeEventListener('change', recheck)
    }
  }, [notice])

  return { formRef, notice, validate, fail, clear }
}
