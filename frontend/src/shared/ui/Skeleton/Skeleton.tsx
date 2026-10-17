import { cn } from '../../lib/cn'
import styles from './Skeleton.module.css'

interface SkeletonProps {
  className?: string
}

/** Bloco de carregamento decorativo; quem o usa anuncia o carregamento (role=status) uma unica vez. */
export function Skeleton({ className }: SkeletonProps) {
  return <span aria-hidden="true" className={cn(styles.skeleton, className)} />
}
