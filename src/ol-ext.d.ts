// ol-ext 는 타입 선언을 제공하지 않으므로, 사용하는 부분만 최소 선언한다.
declare module 'ol-ext/layer/AnimatedCluster' {
  import VectorLayer from 'ol/layer/Vector'
  import type Cluster from 'ol/source/Cluster'
  import type { StyleLike } from 'ol/style/Style'

  interface AnimatedClusterOptions {
    source: Cluster
    style?: StyleLike
    /** 펼침/모임 애니메이션 지속시간(ms) */
    animationDuration?: number
  }

  export default class AnimatedCluster extends VectorLayer<Cluster> {
    constructor(options: AnimatedClusterOptions)
  }
}
