import { useEffect } from 'react'

/** 삭제 등 되돌릴 수 없는(모달) 확인 대화상자. 예/아니오, Esc·배경클릭=취소. */
export function ConfirmDialog(props: {
  message: string
  detail?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={props.onCancel}
    >
      <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-[14px] font-medium text-gray-900">{props.message}</p>
        {props.detail && <p className="mt-1 text-center text-[12px] text-gray-500">{props.detail}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-md border border-gray-300 bg-white py-2 text-[13px] text-gray-700 hover:bg-gray-50"
            onClick={props.onCancel}
          >
            아니오
          </button>
          <button
            type="button"
            className="flex-1 rounded-md border border-red-600 bg-red-600 py-2 text-[13px] font-medium text-white hover:bg-red-500"
            onClick={props.onConfirm}
          >
            예
          </button>
        </div>
      </div>
    </div>
  )
}
