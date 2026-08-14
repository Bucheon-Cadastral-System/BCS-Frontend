import { useDispatch, useSelector } from 'react-redux'
import type { Dispatch, UnknownAction } from '@reduxjs/toolkit'

/**
 * 전역 상태를 읽고 쓰는 훅.
 *
 * <p>뿌리 상태 타입을 여기에 두지 않는다. 그 타입은 저장소를 조립하는 app 이 아는 것이라,
 * 아래 계층이 그것을 알려면 app 을 수입해야 한다(계층이 거꾸로 선다).
 * 대신 상태의 생김새는 선택자가 정한다 — 각 조각이 자기 자리를 아는 선택자를 함께 내보내고,
 * 여기서는 그 선택자의 매개변수 타입을 그대로 물려받는다.
 *
 * <p>보내는 쪽도 같은 이유로 기본 타입을 쓴다. 이 앱은 thunk 를 쓰지 않아 조각들이 내보내는
 * 액션 생성자만 오간다.
 */
export const useAppSelector = useSelector

export const useAppDispatch: () => Dispatch<UnknownAction> = useDispatch
