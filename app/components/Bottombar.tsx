'use client'

import React, { useState, useRef, use, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { House, BotMessageSquare, CalendarIcon, User } from 'lucide-react'
import path from 'path'

function Bottombar() {
  const pathname = usePathname()
  const hiddenRoutes = ["/new",'/marathon'];
  const isHidden = hiddenRoutes.some(route => pathname.startsWith(route));


  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(isHidden);
  }, [pathname])

  // Tracks the scroll position where the user last changed direction
  const pivot = useRef(0);

  // useMotionValueEvent(scrollY, "change", (latest) => {
  //   const previous = scrollY.getPrevious() || 0;

  //   if (isHidden) return;

  //   // Always show the bar if the user scrolls all the way to the top
  //   if (latest <= 0) {
  //     setHidden(false);
  //     return;
  //   }

  //   // Determine if we are moving in a direction that should trigger a state change
  //   const isScrollingDown = latest > previous;

  //   if ((isScrollingDown && !hidden) || (!isScrollingDown && hidden)) {
  //     // Check if the scroll distance has passed the 50px buffer
  //     if (Math.abs(latest - pivot.current) > 150) {
  //       setHidden(isScrollingDown);
  //       pivot.current = latest; // Reset pivot after state change
  //     }
  //   } else {
  //     // User changed direction, reset the pivot point to the current position
  //     pivot.current = latest;
  //   }
  // });

  const navLinks = [
    { name: "Home", href: "/", icon: House },
    { name: "Tasks", href: "/tasks", icon: CalendarIcon },
    // { name: "Ai", href: "/ai", icon: BotMessageSquare },
    { name: "User", href: "/user", icon: User }
  ]

  return (
    <motion.div
      variants={{
        visible: { y: 0 },
        hidden: { y: "100%" }
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className='fixed pvfb-[env(safe-area-inset-bottom)] bottom-0 py-2.5 pb-5 bg-light max-w-md w-screen z-50 rounded-t-4xl'
    >
      <div className="h-full w-auto mx-4   flex items-center justify-around">

        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ;
            // || (link.href === "/" && pathname.startsWith("/marathon"));

          return (
            <Link key={link.name} href={link.href}>
              <div className="flex flex-col items-center gap-1 p-2">
                <Icon
                  strokeWidth={isActive ? 2.5 : 2} // Make it bolder if active
                  className={`
                  w-6 h-6 transition-all duration-300 ease-out 
                  ${isActive
                      ? 'text-darker scale-103 -translate-y-0.75' // Active styles (colored, bigger, moves up slightly)
                      : 'text-dark hover:text-maroon hover:scale-110' // Inactive & Hover styles
                    }
                `}
                />
                {/* Optional tiny dot indicator for active state */}
                {isActive ? (
                  <motion.div
                    layoutId="active-nav-indicator" // <-- THIS IS THE MAGIC
                    className="absolute bottom-3 w-1.5 h-1.5 bg-darker rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }} // Optional: Makes the glide feel bouncy and fluid
                  />
                ) : (
                  // 3. Invisible placeholder so the icon doesn't jump when the dot arrives/leaves
                  <div className="absolute bottom-1 w-1.5 h-1.5" />
                )}
              </div>
            </Link>
          )
        })}

      </div>
      {/* Bottombar content goes here */}
    </motion.div>
  )
}

export default Bottombar



