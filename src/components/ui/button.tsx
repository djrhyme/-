import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[3px] border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'border-moss bg-moss text-white hover:border-moss-dark hover:bg-moss-dark',
        outline: 'border-rule bg-card text-ink hover:border-moss hover:text-moss',
        clay: 'border-clay bg-clay text-white hover:brightness-95',
        ghost: 'border-transparent bg-transparent text-ink-soft hover:text-moss',
        danger: 'border-wrong bg-card text-wrong hover:bg-wrong hover:text-white',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-[0.95rem]',
        lg: 'h-12 px-6 text-lg',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, block, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size, block, className }))} {...props} />;
}

export function LinkButton({
  href,
  children,
  className,
  variant,
  size,
  block,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  block?: boolean;
}) {
  return (
    <a href={href} className={cn(buttonVariants({ variant, size, block, className }))}>
      {children}
    </a>
  );
}
