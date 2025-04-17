"use client"

import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface Particle {
  id: number
  x: number
  y: number
  size: number
  color: string
  velocity: {
    x: number
    y: number
  }
  rotation: number
  rotationSpeed: number
  opacity: number
  shape: "square" | "circle" | "triangle" | "star"
}

interface GoalCelebrationProps {
  isVisible: boolean
  color: string
  sourceRect: DOMRect | null
  onComplete: () => void
  isFrequencyGoal?: boolean
}

export function GoalCelebration({
  isVisible,
  color,
  sourceRect,
  onComplete,
  isFrequencyGoal = false,
}: GoalCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [mounted, setMounted] = useState(false)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const animationDuration = isFrequencyGoal ? 3500 : 2500 // Longer animation for frequency goals

  // Create particles when the celebration becomes visible
  useEffect(() => {
    setMounted(true)

    if (isVisible && sourceRect) {
      // Create particles based on the source rectangle
      const newParticles: Particle[] = []
      // More particles for frequency goals
      const particleCount = isFrequencyGoal ? 120 : 75

      // Generate complementary colors
      const baseColor = color
      const colors = [
        baseColor,
        lightenColor(baseColor, 0.2),
        darkenColor(baseColor, 0.2),
        getComplementaryColor(baseColor),
      ]

      const shapes: Array<"square" | "circle" | "triangle" | "star"> = ["square", "circle", "triangle", "star"]

      for (let i = 0; i < particleCount; i++) {
        // Calculate random starting position within the source rectangle
        const x = sourceRect.left + Math.random() * sourceRect.width
        const y = sourceRect.top + Math.random() * sourceRect.height

        // Random velocity (speed and direction)
        const angle = Math.random() * Math.PI * 2
        // Higher speed for frequency goals
        const speed = 5 + Math.random() * (isFrequencyGoal ? 20 : 15)

        newParticles.push({
          id: i,
          x,
          y,
          size: 5 + Math.random() * 15, // Random size between 5-20px
          color: colors[Math.floor(Math.random() * colors.length)],
          velocity: {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed - (isFrequencyGoal ? 7 : 5), // More upward bias for frequency goals
          },
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * (isFrequencyGoal ? 20 : 15), // Faster rotation for frequency goals
          opacity: 1,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
        })
      }

      setParticles(newParticles)
      startTimeRef.current = Date.now()

      // Start the animation
      if (animationRef.current === null) {
        animationRef.current = requestAnimationFrame(animateParticles)
      }
    }

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isVisible, color, sourceRect, isFrequencyGoal])

  // Animation function
  const animateParticles = () => {
    if (!startTimeRef.current) return

    const elapsed = Date.now() - startTimeRef.current
    const progress = Math.min(elapsed / animationDuration, 1)

    setParticles((prevParticles) =>
      prevParticles.map((particle) => {
        // Apply gravity and friction
        const updatedVelocityY = particle.velocity.y + 0.2 // Gravity
        const updatedVelocityX = particle.velocity.x * 0.98 // Friction

        return {
          ...particle,
          x: particle.x + updatedVelocityX,
          y: particle.y + updatedVelocityY,
          rotation: particle.rotation + particle.rotationSpeed,
          opacity: 1 - progress, // Fade out as the animation progresses
        }
      }),
    )

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animateParticles)
    } else {
      // Animation complete
      setParticles([])
      startTimeRef.current = null
      animationRef.current = null
      onComplete()
    }
  }

  // Helper function to lighten a color
  const lightenColor = (color: string, amount: number): string => {
    try {
      if (color.startsWith("#")) {
        const r = Number.parseInt(color.slice(1, 3), 16)
        const g = Number.parseInt(color.slice(3, 5), 16)
        const b = Number.parseInt(color.slice(5, 7), 16)

        const newR = Math.min(255, Math.floor(r + (255 - r) * amount))
        const newG = Math.min(255, Math.floor(g + (255 - g) * amount))
        const newB = Math.min(255, Math.floor(b + (255 - b) * amount))

        return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`
      }
      return color
    } catch (e) {
      return color
    }
  }

  // Helper function to darken a color
  const darkenColor = (color: string, amount: number): string => {
    try {
      if (color.startsWith("#")) {
        const r = Number.parseInt(color.slice(1, 3), 16)
        const g = Number.parseInt(color.slice(3, 5), 16)
        const b = Number.parseInt(color.slice(5, 7), 16)

        const newR = Math.max(0, Math.floor(r * (1 - amount)))
        const newG = Math.max(0, Math.floor(g * (1 - amount)))
        const newB = Math.max(0, Math.floor(b * (1 - amount)))

        return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`
      }
      return color
    } catch (e) {
      return color
    }
  }

  // Helper function to get complementary color
  const getComplementaryColor = (color: string): string => {
    try {
      if (color.startsWith("#")) {
        const r = Number.parseInt(color.slice(1, 3), 16)
        const g = Number.parseInt(color.slice(3, 5), 16)
        const b = Number.parseInt(color.slice(5, 7), 16)

        // Simple complementary color (invert)
        const newR = 255 - r
        const newG = 255 - g
        const newB = 255 - b

        return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`
      }
      return color
    } catch (e) {
      return color
    }
  }

  // Render different shapes based on the particle shape
  const renderParticle = (particle: Particle) => {
    switch (particle.shape) {
      case "circle":
        return (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              transform: `rotate(${particle.rotation}deg)`,
              opacity: particle.opacity,
            }}
          />
        )
      case "triangle":
        return (
          <div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: 0,
              height: 0,
              borderLeft: `${particle.size / 2}px solid transparent`,
              borderRight: `${particle.size / 2}px solid transparent`,
              borderBottom: `${particle.size}px solid ${particle.color}`,
              transform: `rotate(${particle.rotation}deg)`,
              opacity: particle.opacity,
            }}
          />
        )
      case "star":
        return (
          <div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill={particle.color}
              style={{
                width: "100%",
                height: "100%",
                transform: `rotate(${particle.rotation}deg)`,
              }}
            >
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
        )
      case "square":
      default:
        return (
          <div
            key={particle.id}
            className="absolute"
            style={{
              left: `${particle.x}px`,
              top: `${particle.y}px`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              transform: `rotate(${particle.rotation}deg)`,
              opacity: particle.opacity,
            }}
          />
        )
    }
  }

  if (!mounted) return null

  // Use createPortal to render at the document body level
  return createPortal(
    <div className={cn("fixed inset-0 pointer-events-none z-50", !isVisible && "hidden")}>
      {particles.map((particle) => renderParticle(particle))}
    </div>,
    document.body,
  )
}
