import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, MinusCircle, Hash, Play, RotateCcw, LayoutGrid } from 'lucide-react';

// 로또 스타일 공 색상 반환 함수
const getBallColor = (num: number) => {
  const n = num % 50; // 50 초과 시 색상 반복
  const normalizedNum = n === 0 ? 50 : n;
  
  if (normalizedNum <= 10) return 'bg-[#fbc400] text-amber-950 border-[#dca600]';
  if (normalizedNum <= 20) return 'bg-[#69c8f2] text-slate-900 border-[#4ba3cc]';
  if (normalizedNum <= 30) return 'bg-[#ff7272] text-white border-[#d95353]';
  if (normalizedNum <= 40) return 'bg-[#aaa] text-white border-[#888]';
  return 'bg-[#b0d840] text-green-950 border-[#8db52b]';
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function App() {
  const [minNum, setMinNum] = useState<number | ''>(1);
  const [maxNum, setMaxNum] = useState<number | ''>(27); // 기본값을 27로 설정
  const [excludeText, setExcludeText] = useState<string>('');
  const [drawCount, setDrawCount] = useState<number | ''>(3);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isSorted, setIsSorted] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [highlightedNumber, setHighlightedNumber] = useState<number | null>(null);

  const drawingIdRef = useRef(0);

  const { validPool, poolError } = useMemo(() => {
    if (minNum === '' || maxNum === '') return { validPool: [], poolError: '번호 범위를 입력해주세요.' };
    if (minNum > maxNum) return { validPool: [], poolError: '시작 번호가 끝 번호보다 큽니다.' };
    
    const excludes = excludeText
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n));
    const excludeSet = new Set(excludes);
    
    const pool = [];
    for (let i = minNum; i <= maxNum; i++) {
      if (!excludeSet.has(i)) pool.push(i);
    }
    
    const target = drawCount === '' ? 0 : drawCount;
    if (target <= 0) {
      return { validPool: pool, poolError: '뽑을 인원은 1명 이상이어야 합니다.' };
    }
    if (pool.length < target) {
       return { validPool: pool, poolError: `추첨 인원(${target}명)이 가능한 번호 수(${pool.length}개)보다 많습니다.` };
    }

    return { validPool: pool, poolError: null };
  }, [minNum, maxNum, excludeText, drawCount]);

  // 설정이 바뀌면 진행중인 추첨 리셋
  useEffect(() => {
    handleReset();
  // eslint-disable-next-deps
  }, [validPool.length, minNum, maxNum, excludeText, drawCount]);

  const handleDraw = async () => {
    if (poolError || validPool.length === 0) return;
    
    const drawId = ++drawingIdRef.current;
    setIsDrawing(true);
    setIsSorted(false);
    setDrawnNumbers([]);
    setHighlightedNumber(null);
    
    const targetCount = drawCount === '' ? 1 : drawCount;
    
    // Fisher-Yates 셔플로 당첨번호 미리 결정
    const shuffled = [...validPool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const finalWinners = shuffled.slice(0, targetCount);
    
    const isFastMode = targetCount > 10;
    let currentDrawn: number[] = [];

    for (let i = 0; i < targetCount; i++) {
      if (drawId !== drawingIdRef.current) return;

      const remainingPool = validPool.filter(n => !currentDrawn.includes(n));
      
      // 서스펜스(긴장감) 연출: 풀 안의 공들을 무작위로 하이라이트
      const suspenseTime = isFastMode ? 300 : (i === targetCount - 1 ? 4000 : 2500);
      let elapsed = 0;
      let currentInterval = isFastMode ? 50 : 60;

      while (elapsed < suspenseTime) {
        if (drawId !== drawingIdRef.current) return;
        const randomNum = remainingPool[Math.floor(Math.random() * remainingPool.length)];
        setHighlightedNumber(randomNum);
        
        await sleep(currentInterval);
        elapsed += currentInterval;
        
        // 룰렛처럼 끝에 갈수록 점차 느려지는 효과
        if (!isFastMode && elapsed > suspenseTime * 0.6) {
           currentInterval += 15;
        }
      }

      if (drawId !== drawingIdRef.current) return;
      
      // 당첨될 공을 뽑기 직전에 길게 하이라이트 (뜸 들이기)
      const winner = finalWinners[i];
      setHighlightedNumber(winner);
      await sleep(isFastMode ? 100 : 1200);

      if (drawId !== drawingIdRef.current) return;

      // 하이라이트 해제 후 당첨 목록으로 이동 (layoutId 애니메이션 발동)
      setHighlightedNumber(null);
      currentDrawn = [...currentDrawn, winner];
      setDrawnNumbers(currentDrawn);

      // 공이 날아가는 시간을 기다려주고, 다음 공 뽑기 전 잠시 대기
      if (i < targetCount - 1) {
        await sleep(isFastMode ? 100 : 1000);
      }
    }
    
    if (drawId === drawingIdRef.current) {
      setIsDrawing(false);
      
      // 모두 뽑은 후 약간 대기했다가 정렬 액션
      if (!isFastMode) {
         await sleep(1500);
         if (drawId === drawingIdRef.current) {
            setIsSorted(true);
            setDrawnNumbers([...finalWinners].sort((a,b) => a-b));
         }
      } else {
         setIsSorted(true);
         setDrawnNumbers([...finalWinners].sort((a,b) => a-b));
      }
    }
  };

  const handleReset = () => {
    drawingIdRef.current++; // 진행중인 추첨 취소
    setIsDrawing(false);
    setIsSorted(false);
    setDrawnNumbers([]);
    setHighlightedNumber(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center py-10 px-4 md:py-16 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <main className="w-full max-w-4xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-2">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-2 shadow-sm">
            <LayoutGrid className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">전체 공 뽑기 추첨기</h1>
          <p className="text-slate-500">전체 인원의 공을 한눈에 보고 실감나게 추첨하세요.</p>
        </div>

        {/* Configuration Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5 max-w-xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Range Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4 text-slate-400" />
                번호 범위 (총 인원)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={minNum}
                  onChange={(e) => setMinNum(e.target.value === '' ? '' : Number(e.target.value))}
                  className="flex-1 w-full py-2.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center transition-shadow"
                  placeholder="시작"
                  disabled={isDrawing}
                />
                <span className="text-slate-400 font-medium">~</span>
                <input
                  type="number"
                  value={maxNum}
                  onChange={(e) => setMaxNum(e.target.value === '' ? '' : Number(e.target.value))}
                  className="flex-1 w-full py-2.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center transition-shadow"
                  placeholder="끝"
                  disabled={isDrawing}
                />
              </div>
            </div>

            {/* Draw Count */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                뽑을 인원
              </label>
              <div className="flex items-center gap-2 relative">
                <input
                  type="number"
                  min="1"
                  value={drawCount}
                  onChange={(e) => setDrawCount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center pr-10 transition-shadow"
                  disabled={isDrawing}
                />
                <span className="absolute right-4 text-slate-400 font-medium pointer-events-none">명</span>
              </div>
            </div>
          </div>

          {/* Exclude Numbers */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-slate-400" />
              결석/제외 번호 <span className="text-xs font-normal text-slate-400">(선택)</span>
            </label>
            <input
              type="text"
              value={excludeText}
              onChange={(e) => setExcludeText(e.target.value)}
              placeholder="예: 4, 13 (쉼표로 구분)"
              className="w-full py-2.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
              disabled={isDrawing}
            />
          </div>
          
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleDraw}
              disabled={!!poolError || isDrawing}
              className="flex-1 bg-slate-900 text-white font-semibold text-lg py-4 px-6 rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
            >
              {isDrawing ? (
                <span className="animate-pulse flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 animate-spin-slow" /> 
                  {drawnNumbers.length + 1} / {drawCount} 뽑는 중...
                </span>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  추첨 시작
                </>
              )}
            </button>
            
            {(drawnNumbers.length > 0 || isDrawing) && (
              <button
                onClick={handleReset}
                className="px-6 py-4 rounded-xl bg-white border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-slate-200"
                title="초기화"
              >
                초기화
              </button>
            )}
          </div>
          {poolError && !isDrawing && (
            <p className="text-red-500 text-sm text-center font-medium mt-1">
              {poolError}
            </p>
          )}
        </div>

        {/* --- Animation Layout Context --- */}
        <div className="flex flex-col gap-8 w-full mt-4">
          
          {/* Winners Section */}
          <AnimatePresence>
            {(drawnNumbers.length > 0 || isDrawing) && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-6 min-h-[160px] shadow-sm flex flex-col items-center justify-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/20" />
                <div className="flex items-center gap-2 mb-6">
                  <Trophy className="w-6 h-6 text-indigo-500" />
                  <h2 className="text-xl font-bold text-indigo-900">당첨자 명단</h2>
                </div>
                
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5 w-full">
                  {/* 그려진 슬롯만큼 렌더링. 비어있는 슬롯도 표시 */}
                  {Array.from({ length: Number(drawCount) }).map((_, idx) => {
                    const num = drawnNumbers[idx];
                    const isRevealed = num !== undefined;

                    return (
                      <div key={`winner-slot-${idx}`} className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 shrink-0">
                        {/* Empty Placeholder in Winners */}
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-indigo-200 bg-white/50" />
                        
                        {/* Actual Winner Ball */}
                        {isRevealed && (
                          <motion.div
                            layoutId={`ball-${num}`}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            className={`absolute inset-0 rounded-full flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-black border-2 shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.25),_2px_4px_12px_rgba(0,0,0,0.2)] z-20 ${getBallColor(num)}`}
                          >
                            <div className="absolute top-1.5 left-2 sm:top-2 sm:left-3 w-5 h-3 sm:w-7 sm:h-4 bg-white/40 rounded-full rotate-[-35deg]" />
                            <span className="drop-shadow-sm">{num}</span>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* All Balls Pool Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                전체 참가 번호 <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-sm font-semibold">{validPool.length}명</span>
              </h2>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 lg:gap-4">
              {validPool.map((num) => {
                const isDrawn = drawnNumbers.includes(num);
                const isHighlighted = highlightedNumber === num;

                return (
                  <div key={`pool-slot-${num}`} className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 shrink-0">
                    {/* Empty slot left behind when ball is drawn */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200 bg-slate-50" />
                    
                    {/* The Ball in the pool */}
                    {!isDrawn && (
                      <motion.div
                        layoutId={`ball-${num}`}
                        transition={{ type: "spring", stiffness: 100, damping: 15 }}
                        className={`absolute inset-0 rounded-full flex items-center justify-center font-bold text-sm sm:text-base md:text-lg border-2 shadow-sm transition-transform duration-75 cursor-default
                          ${isHighlighted 
                            ? 'scale-125 ring-4 ring-indigo-500 ring-offset-1 z-30 brightness-110 shadow-lg' 
                            : 'hover:scale-110 hover:z-20 z-10'
                          } ${getBallColor(num)}`}
                      >
                        <div className="absolute top-1 left-1.5 sm:top-1.5 sm:left-2 w-3 h-1.5 sm:w-4 sm:h-2 bg-white/40 rounded-full rotate-[-35deg]" />
                        <span className="drop-shadow-sm">{num}</span>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {validPool.length === 0 && (
               <div className="text-center py-10 text-slate-400">
                 유효한 번호가 없습니다. 설정을 확인해주세요.
               </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
