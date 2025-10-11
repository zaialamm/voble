'use client'

import Image from 'next/image'
import { Card, CardContent} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowRight,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { CountdownTimer } from '@/components/countdown-timer'
import { LiveGameFeed } from '@/components/live-game-feed'  
import { InteractiveDemo } from '@/components/interactive-demo'

export default function Home() {
  // Calculate countdown dates
  const now = new Date()
  const dailyEnd = new Date(now)
  dailyEnd.setHours(23, 59, 59, 999)
  
  const weeklyEnd = new Date(now)
  const daysUntilSunday = 7 - now.getDay()
  weeklyEnd.setDate(now.getDate() + daysUntilSunday)
  weeklyEnd.setHours(23, 59, 59, 999)
  
  const monthlyEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Ticket price 
  const TICKET_PRICE = '0.001 SOL'

  return (
    <div className="min-h-screen">

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-4 text-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        
        <div className="max-w-6xl mx-auto">
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-slate-900 dark:text-white">
            Turn Your Word Skills<br />Into Real Money
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
           Every word you know has earning potential. Play for {TICKET_PRICE}, and let your skills pay the bills.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base"
              onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSft9q877-DdfO-hdU5FJkfmab0H9DRPe9pBwEvWRTltNdSjNQ/viewform?usp=sharing&ouid=117191149413039806643', '_blank', 'noopener,noreferrer')}
            >
              Join Waitlist
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="px-8 py-6 text-base"
              onClick={() => document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </Button>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
            <div className="text-center p-4 sm:p-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">1.2K+</div>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">Players</div>
            </div>
            <div className="text-center p-4 sm:p-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">89</div>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">SOL Pool</div>
            </div>
            <div className="text-center p-4 sm:p-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">5.8K</div>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">Games</div>
            </div>
            <div className="text-center p-4 sm:p-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">343</div>
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">SOL Paid</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">*Demo data for illustration</p>
        </div>
      </section>

      {/* Interactive Demo */}
      <section id="demo-section" className="py-20 px-4 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">Try Before You Play</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Experience the gameplay without connecting your wallet.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            <div className="order-2 lg:order-1">
              <InteractiveDemo />
            </div>
            <div className="order-1 lg:order-2">
              <LiveGameFeed />
            </div>
          </div>
        </div>
      </section>

      {/* Prize Pools - Clean & Unified */}
      <section className="py-20 px-4 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
              Prize Pools
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Top 3 players in each tournament split the prize pool. Plus, everyone has a chance at the lucky draw.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Daily Prize */}
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Daily Prize</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">2.5 SOL</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">≈ $162</div>
                </div>
                <CountdownTimer targetDate={dailyEnd} label="Ends In" variant="daily" minimal />
              </CardContent>
            </Card>
            
            {/* Weekly Prize */}
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-2">Weekly Prize</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">15 SOL</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">≈ $975</div>
                </div>
                <CountdownTimer targetDate={weeklyEnd} label="Ends In" variant="weekly" minimal />
              </CardContent>
            </Card>
            
            {/* Monthly Prize */}
            <Card className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <CardContent className="p-6">
                <div className="text-center mb-4">
                  <div className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">Monthly Prize</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">50 SOL</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">≈ $3,250</div>
                </div>
                <CountdownTimer targetDate={monthlyEnd} label="Ends In" variant="monthly" minimal />
              </CardContent>
            </Card>
            
            {/* Lucky Draw - No Card, Same Height */}
            <div className="flex flex-col justify-center items-center h-full bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg p-6">
              <div className="text-center">
                <div className="text-sm font-medium text-pink-600 dark:text-pink-400 mb-4">Lucky Draw</div>
                <div className="text-6xl mb-4">🎲</div>
                <div className="text-sm text-pink-600 dark:text-pink-400 font-medium">Coming Soon</div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              *Demo data for illustration. One payment of 0.001 SOL enters you into all competitions.
            </p>
          </div>
        </div>
      </section>


      {/* How It Works - Simplified to 3 Steps */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">How It Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Buy Ticket</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Pay 0.001 SOL to enter all daily, weekly, and monthly competitions.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Guess the Word</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Find the 6-letter word in 7 tries. Each guess gives you instant feedback.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Win Real SOL</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Top 3 players each day win SOL prizes. The better your score, the bigger your share.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Powered By Partners - Enhanced */}
      <section className="py-16 px-4 bg-white dark:bg-slate-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-slate-900 dark:text-white">Our Partners</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            {/* MagicBlock */}
            <div className="flex justify-center">
              <Image 
                src="/images/MagicBlock-Logo-White.png" 
                alt="MagicBlock Logo" 
                width={220} 
                height={88}
                className="object-contain filter brightness-0 dark:brightness-100 opacity-60"
              />
            </div>

            {/* Privy */}
            <div className="flex justify-center">
              <Image 
                src="/images/privy-logo-white.svg" 
                alt="Privy Logo" 
                width={180} 
                height={72}
                className="object-contain filter brightness-0 dark:brightness-100 opacity-60"
              />
            </div>

            {/* ST Indo */}
            <div className="flex justify-center">
              <Image 
                src="/images/st-indo.png" 
                alt="ST Indo Logo" 
                width={200} 
                height={80}
                className="object-contain filter brightness-0 dark:brightness-100 opacity-60"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Removed until we have real users */}

      {/* Roadmap - Moved to separate page */}

      {/* FAQ */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">FAQ</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Everything you need to know about Voble
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="item-1" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 sm:px-6">
              <AccordionTrigger className="text-sm sm:text-base font-medium hover:no-underline text-slate-900 dark:text-white">
                How much does it cost to play?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                Each game costs {TICKET_PRICE} (not final) to play. Your payment is automatically split across daily, weekly, and monthly prize pools. 
                This means one payment gives you three chances to win.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 sm:px-6">
              <AccordionTrigger className="text-sm sm:text-base font-medium hover:no-underline text-slate-900 dark:text-white">
                How do I win prizes?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                Your score is based on correct guesses, completion time, and efficiency. The top 3 players in each tournament period 
                (daily, weekly, monthly) split the prize pool. First place gets the biggest share, but all top 3 winners earn SOL!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 sm:px-6">
              <AccordionTrigger className="text-sm sm:text-base font-medium hover:no-underline text-slate-900 dark:text-white">
                Is the game fair?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                Yes! Each word is randomly selected using Ephemeral VRF (Verifiable Random Function) from Magicblocks. 
                The selection process is verifiable and transparent—no one can predict or influence which word you will get. 
                Every player gets a fair shot at winning.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 sm:px-6">
              <AccordionTrigger className="text-sm sm:text-base font-medium hover:no-underline text-slate-900 dark:text-white">
                Do I need a Solana wallet?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                No wallet needed! Sign up with just your email or Google account. 
                We handle all the crypto complexity behind the scenes—you just play and win. 
                Your winnings are automatically secured in a wallet we create for you.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 sm:px-6">
              <AccordionTrigger className="text-sm sm:text-base font-medium hover:no-underline text-slate-900 dark:text-white">
                Can I play multiple games per day?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                To keep competition fair for everyone, you can play one game per day. 
                This gives all players an equal chance to compete. Make your daily game count—give it your best shot!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 sm:px-6">
              <AccordionTrigger className="text-sm sm:text-base font-medium hover:no-underline text-slate-900 dark:text-white">
                What if I don&apos;t win the top 3?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                Every player who plays has a chance to win our weekly lucky draw! One random player is selected each week 
                to win a special prize from our platform revenue. Plus, you can try again tomorrow&mdash;your 0.001 SOL helps 
                grow the prize pools for the entire community.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 sm:px-6">
              <AccordionTrigger className="text-sm sm:text-base font-medium hover:no-underline text-slate-900 dark:text-white">
                Can we play Voble on Seeker / Solana Mobile?
              </AccordionTrigger>
              <AccordionContent className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                Yes, it&apos;s coming soon! We&apos;re working on optimizing Voble for Solana Mobile and Seeker devices 
                to give you the best mobile gaming experience.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-blue-600 text-white">
        
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Join the Beta</h2>
          <p className="text-lg mb-8 opacity-90">
            We&apos;re in early beta&mdash;expect bugs and rough edges. Your feedback helps us improve before launch.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-6 text-base font-medium"
              onClick={() => window.location.href = '#'}
            >
              Get Early Access
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 px-8 py-6 text-base"
              onClick={() => window.open('https://twitter.com/voblefun', '_blank')}
            >
              Follow Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
