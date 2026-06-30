import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type AnimatedPressableProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** pressedScale is applied via mousedown/touchstart JS events so any value works. */
  pressedScale?: number;
};

export function AnimatedPressable({
  children,
  className = '',
  style,
  pressedScale = 0.985,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  ...props
}: AnimatedPressableProps) {
  return (
    <button
      {...props}
      className={`transition-[transform,opacity] duration-100 ${className}`}
      style={style as CSSProperties}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = `scale(${pressedScale})`;
        e.currentTarget.style.opacity = '0.94';
        onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.opacity = '1';
        onMouseUp?.(e);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.opacity = '1';
        onMouseLeave?.(e);
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = `scale(${pressedScale})`;
        e.currentTarget.style.opacity = '0.94';
        onTouchStart?.(e);
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.opacity = '1';
        onTouchEnd?.(e);
      }}
    >
      {children}
    </button>
  );
}
