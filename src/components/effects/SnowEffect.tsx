import React, { useEffect, useRef } from 'react';

interface Snowflake {
    x: number;
    y: number;
    radius: number;
    speed: number;
    drift: number;
    opacity: number;
}

interface SnowEffectProps {
    count?: number;
    speed?: number;
}

const SnowEffect: React.FC<SnowEffectProps> = ({ count = 100, speed = 1 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const snowflakesRef = useRef<Snowflake[]>([]);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createSnowflake = (): Snowflake => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 1 * speed + 0.5 * speed,
            drift: Math.random() * 0.5 - 0.25,
            opacity: Math.random() * 0.6 + 0.3,
        });

        const initSnowflakes = () => {
            snowflakesRef.current = Array.from({ length: count }, createSnowflake);
        };

        const updateSnowflake = (snowflake: Snowflake) => {
            snowflake.y += snowflake.speed;
            snowflake.x += snowflake.drift;

            if (snowflake.y > canvas.height) {
                snowflake.y = -10;
                snowflake.x = Math.random() * canvas.width;
            }

            if (snowflake.x > canvas.width) {
                snowflake.x = 0;
            } else if (snowflake.x < 0) {
                snowflake.x = canvas.width;
            }
        };

        const drawSnowflake = (snowflake: Snowflake) => {
            ctx.beginPath();
            ctx.arc(snowflake.x, snowflake.y, snowflake.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${snowflake.opacity})`;
            ctx.fill();
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            snowflakesRef.current.forEach((snowflake) => {
                updateSnowflake(snowflake);
                drawSnowflake(snowflake);
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        resizeCanvas();
        initSnowflakes();
        animate();

        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [count, speed]);

    return <canvas ref={canvasRef} className="effects-canvas" />;
};

export default SnowEffect;
