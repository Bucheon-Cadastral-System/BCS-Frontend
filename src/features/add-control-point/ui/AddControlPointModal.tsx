import { useEffect, useState } from 'react'
import { POINT_TYPES } from '@/entities/control-point'
import type { PointType } from '@/entities/control-point'
import { TM_ORIGINS, tmToWgs84 } from '@/shared/lib/crs'
import type { TmEpsg } from '@/shared/lib/crs'
import { MODAL_CANCEL_BTN, MODAL_INPUT, MODAL_SELECT, MODAL_SUBMIT_BTN, Modal, ModalField } from '@/shared/ui/Modal'

export interface AddControlPointValues {
  pointNo: string
  name: string
  type: PointType
  /** 성과 좌표(권위값) — 측량 관례상 X=북(northing), Y=동(easting) */
  northing: number
  easting: number
  tmEpsg: TmEpsg
  /** TM에서 파생한 표시용 경위도 */
  lng: number
  lat: number
}

/**
 * 기준점 추가 입력 — 성과 좌표(TM)가 권위값이라 사용자가 직접 입력하고, 경위도는 그 값에서 파생해 보여주기만 한다.
 * 좌표를 손에 들고 있지 않을 때를 위해 '지도에서 위치 찍기'로 시작값을 채울 수 있다(찍은 값은 시작값일 뿐 실제 성과가 아니다).
 */
export function AddControlPointModal(props: {
  defaultType: PointType
  defaultEpsg: TmEpsg
  /**
   * 지도에서 찍어 온 시작값 — 값이 새로 오면 좌표 칸을 채운다(입력하던 다른 값은 유지).
   * 숫자만으로는 어느 원점 기준인지 알 수 없으므로 변환에 쓴 원점을 함께 받아 같이 맞춘다.
   */
  picked: { northing: number; easting: number; epsg: TmEpsg } | null
  /** 지도 클릭을 기다리는 중 — 이때 모달은 숨고 지도만 보인다 */
  picking: boolean
  onPick: () => void
  submitting: boolean
  onSubmit: (values: AddControlPointValues) => void
  onCancel: () => void
}) {
  const [pointNo, setPointNo] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<PointType>(props.defaultType)
  const [tmEpsg, setTmEpsg] = useState<TmEpsg>(props.defaultEpsg)
  const [northing, setNorthing] = useState('')
  const [easting, setEasting] = useState('')

  // 지도에서 찍어 오면 좌표만 갱신 — 모달은 마운트를 유지하므로 관리번호·이름 등 입력값은 그대로 남는다
  const picked = props.picked
  useEffect(() => {
    if (!picked) return
    setNorthing(picked.northing.toFixed(2))
    setEasting(picked.easting.toFixed(2))
    setTmEpsg(picked.epsg) // 좌표와 원점이 어긋나면 저장되는 경위도가 찍은 위치와 달라진다
  }, [picked])

  const n = Number(northing)
  const e = Number(easting)
  // 빈 문자열·공백은 Number()가 0으로 바꾸므로, 값이 비면 좌표 없음으로 본다
  const coordsValid = northing.trim() !== '' && easting.trim() !== '' && Number.isFinite(n) && Number.isFinite(e)
  // 경위도는 TM에서 한 방향으로만 파생한다(따로 수정하면 두 값이 어긋나 권위가 모호해진다)
  const geo = coordsValid ? tmToWgs84(e, n, tmEpsg) : null
  const canSubmit = pointNo.trim() !== '' && name.trim() !== '' && geo !== null && !props.submitting

  function submit() {
    if (!canSubmit || !geo) return
    props.onSubmit({
      pointNo: pointNo.trim(),
      name: name.trim(),
      type,
      northing: n,
      easting: e,
      tmEpsg,
      lng: geo.lng,
      lat: geo.lat,
    })
  }

  return (
    <Modal
      title="기준점 추가"
      description="성과 좌표(TM)가 공식값입니다. 지도에서 찍은 위치는 시작값이므로 실제 성과로 바꿔 주세요."
      busy={props.submitting}
      hidden={props.picking}
      onClose={props.onCancel}
      onSubmit={submit}
      footer={
        <>
          <button type="button" className={MODAL_CANCEL_BTN} onClick={props.onCancel} disabled={props.submitting}>
            취소
          </button>
          <button type="submit" className={MODAL_SUBMIT_BTN} disabled={!canSubmit}>
            {props.submitting ? '등록 중…' : '등록'}
          </button>
        </>
      }
    >
      <ModalField label="관리번호" hint="예: 41192D000001265">
        <input className={MODAL_INPUT} value={pointNo} onChange={(ev) => setPointNo(ev.target.value)} placeholder="41192D000001265" />
      </ModalField>

      <ModalField label="기준점명">
        <input className={MODAL_INPUT} value={name} onChange={(ev) => setName(ev.target.value)} placeholder="1465공" />
      </ModalField>

      <ModalField label="종류">
        <select className={MODAL_SELECT} value={type} onChange={(ev) => setType(ev.target.value as PointType)}>
          {POINT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </ModalField>

      <ModalField label="원점">
        <select className={MODAL_SELECT} value={tmEpsg} onChange={(ev) => setTmEpsg(ev.target.value as TmEpsg)}>
          {TM_ORIGINS.map((o) => (
            <option key={o.epsg} value={o.epsg}>
              {o.label} ({o.epsg})
            </option>
          ))}
        </select>
      </ModalField>

      <div className="grid grid-cols-2 gap-2">
        <ModalField label="X 좌표 (북, m)">
          <input className={MODAL_INPUT} value={northing} onChange={(ev) => setNorthing(ev.target.value)} inputMode="decimal" placeholder="545236.77" />
        </ModalField>
        <ModalField label="Y 좌표 (동, m)">
          <input className={MODAL_INPUT} value={easting} onChange={(ev) => setEasting(ev.target.value)} inputMode="decimal" placeholder="181840.96" />
        </ModalField>
      </div>

      <button
        type="button"
        onClick={props.onPick}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z" />
          <circle cx="12" cy="11" r="2" />
        </svg>
        지도에서 위치 찍기
      </button>

      <div className="rounded-md bg-gray-50 px-3 py-2 text-[12px] text-gray-600 dark:bg-gray-900/40 dark:text-gray-400">
        <span className="font-medium">경위도(자동 계산)</span>
        <span className="ml-2 tabular-nums">
          {geo ? `${geo.lng.toFixed(6)}, ${geo.lat.toFixed(6)}` : '좌표를 입력하거나 지도에서 찍어 주세요'}
        </span>
      </div>
    </Modal>
  )
}
