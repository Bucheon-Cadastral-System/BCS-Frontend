import type { ManagedUser } from './user'

/**
 * 사용자 기능(가입·승인·조회)이 아직 서버에 없어 화면을 채우는 임시 목록.
 * 조회 API가 생기면 이 파일만 지우고 쿼리로 바꾸도록, 목업은 여기 한 곳에만 둔다.
 */
export const MOCK_USERS: ManagedUser[] = [
  {
    id: 'user-1',
    kakaoId: '3948217551',
    name: '김지훈',
    phone: '01012345678',
    email: 'jihun.kim@example.com',
    district: '원미구',
    department: '민원지적과',
    team: '지적관리팀',
    position: '주무관',
    status: 'PENDING',
    requestedAt: '2026-07-16',
  },
  {
    id: 'user-2',
    kakaoId: '3814072264',
    name: '박서연',
    phone: '01098765432',
    email: 'seoyeon.park@example.com',
    district: '소사구',
    department: '민원지적과',
    team: '지적정보팀',
    position: '팀장',
    status: 'ACTIVE',
    requestedAt: '2026-07-12',
  },
  {
    id: 'user-3',
    kakaoId: '3729441088',
    name: '이민수',
    phone: '01024681357',
    email: 'minsu.lee@example.com',
    district: '오정구',
    department: '민원지적과',
    team: '부동산관리팀',
    position: '주무관',
    status: 'INACTIVE',
    requestedAt: '2026-07-08',
  },
  {
    id: 'user-4',
    kakaoId: '3690115523',
    name: '정수아',
    phone: '01033445566',
    email: 'sua.jung@example.com',
    district: '원미구',
    department: '민원지적과',
    team: '지적정보팀',
    position: '주무관',
    status: 'ACTIVE',
    requestedAt: '2026-06-30',
  },
  {
    id: 'user-5',
    kakaoId: '3655208814',
    name: '한도영',
    phone: '01077889900',
    email: 'doyoung.han@example.com',
    district: '소사구',
    department: '민원지적과',
    team: '지적관리팀',
    position: '주무관',
    status: 'ACTIVE',
    requestedAt: '2026-06-24',
  },
  {
    id: 'user-6',
    kakaoId: '3611947702',
    name: '오세진',
    phone: '01022113344',
    email: 'sejin.oh@example.com',
    district: '오정구',
    department: '민원지적과',
    team: '지적관리팀',
    position: '팀장',
    status: 'ACTIVE',
    requestedAt: '2026-06-18',
  },
]

/** 지금 로그인한 사용자 — 인증이 붙기 전까지 화면에 이름을 보여줄 자리를 메운다 */
export const MOCK_CURRENT_USER = MOCK_USERS[1]
