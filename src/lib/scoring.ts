// Scoring utilities for STC Algo Challenge

export interface TaskScoringInput {
  attemptsCount: number;
  hintsUsed: number;
  timeSpentSeconds: number;
  movesCount?: number;
  details?: any;
}

export function getFeedbackAndScore(taskId: string, input: TaskScoringInput): { score: number; feedback: string } {
  const { hintsUsed = 0, movesCount = 0, details = {} } = input;
  let score = 0;
  let feedback = "";

  const hintPenalty = hintsUsed * 10;
  // Har bir xato urinish yoki noto'g'ri topshirish uchun 5 ball chegiriladi (maksimal 25 ballgacha)
  const attemptsPenalty = Math.max(0, Math.min(25, ((input.attemptsCount || 1) - 1) * 5));

  switch (taskId) {
    case "coin_change": {
      // details contains { roundResults: Array<{ target: number, userCoins: number[], optimalCoins: number[], correct: boolean, isOptimal: boolean }> }
      const rounds = details.roundResults || [];
      let roundScoreSum = 0;
      let completedCount = 0;

      rounds.forEach((r: any) => {
        if (r.correct) {
          completedCount++;
          if (r.isOptimal) {
            roundScoreSum += 30; // Max for optimal
          } else {
            // Correct but not minimal coins
            const extraCoins = (r.userCoins.length || 0) - (r.optimalCoins.length || 0);
            const rScore = Math.max(15, 30 - extraCoins * 5);
            roundScoreSum += rScore;
          }
        }
      });

      const completionBonus = completedCount === 3 ? 10 : completedCount * 3;
      score = roundScoreSum + completionBonus - hintPenalty - attemptsPenalty;
      score = Math.max(0, Math.min(100, score));

      if (completedCount === 3) {
        const allOptimal = rounds.every((r: any) => r.isOptimal);
        if (allOptimal) {
          feedback = "Ajoyib! Barcha raundlarda eng kam tangalar soni bilan optimal yechim topdingiz!";
        } else {
          feedback = "Yaxshi! Hamma summalarni yig'dingiz, lekin ba'zi raundlarda undan ham kamroq tanga ishlatish mumkin edi.";
        }
      } else if (completedCount > 0) {
        feedback = `Challenge tugallanmadi. ${completedCount} ta raundni muvaffaqiyatli yig'dingiz.`;
      } else {
        feedback = "Afsuski, birorta ham raundda to'g'ri summa yig'ilmadi.";
      }
      break;
    }

    case "greedy_backpack": {
      // details contains { selectedIds: string[], totalWeight: number, totalValue: number, isOptimal: boolean }
      const { totalWeight = 0, totalValue = 0, isOptimal = false } = details;

      if (totalWeight > 10) {
        score = Math.max(0, 10 - hintPenalty - attemptsPenalty); // Heavy penalty for going overweight
        feedback = "Ryukzak haddan tashqari og'ir bo'lib ketdi (10 kg dan oshdi). Bu noto'g'ri yechim.";
      } else {
        // Optimal value is 25
        const ratio = totalValue / 25;
        const baseScore = Math.round(ratio * 90);
        const optimalBonus = isOptimal ? 10 : 0;
        score = baseScore + optimalBonus - hintPenalty - attemptsPenalty;
        score = Math.max(0, Math.min(100, score));

        if (isOptimal) {
          feedback = "Mukammal! Siz eng foydali buyumlar to'plamini (Laptop, Kitob va Powerbank) tanladingiz (jami 25 ball).";
        } else if (totalValue >= 20) {
          feedback = `Yaxshi natija! ${totalValue} ballik to'plam yig'dingiz. Ammo bundan ham qimmatroq optimal variant bor edi.`;
        } else {
          feedback = `Pastroq samaradorlik. Atigi ${totalValue} ballik to'plam yig'dingiz. Ko'proq qiymatli buyumlarni tanlashga harakat qiling.`;
        }
      }
      break;
    }

    case "binary_treasure": {
      // details contains { found: boolean, guessesCount: number, rangeWidthRemaining: number }
      const { found = false, guessesCount = 0, rangeWidthRemaining = 100 } = details;

      if (found) {
        if (guessesCount <= 4) score = 100;
        else if (guessesCount === 5) score = 85;
        else if (guessesCount === 6) score = 70;
        else if (guessesCount === 7) score = 55;

        score -= (hintPenalty + attemptsPenalty);
        score = Math.max(0, Math.min(100, score));
        feedback = `Ajoyib! Xazinani ${guessesCount} ta urinishda topdingiz! Ikkilik qidiruv (Binary Search) strategiyasi muvaffaqiyatli qo'llanildi.`;
      } else {
        // Not found, score based on how much search range was narrowed
        const narrowedRatio = (100 - rangeWidthRemaining) / 100;
        const baseScore = Math.max(0, Math.round(narrowedRatio * 30));
        score = baseScore - hintPenalty - attemptsPenalty;
        score = Math.max(0, Math.min(100, score));
        feedback = `Xazina topilmadi. Qidiruv oralig'ini ${100 - rangeWidthRemaining}% ga qisqartira oldingiz. Ikkilik qidiruvda har doim o'rtadagi qiymatni tekshiring!`;
      }
      break;
    }

    case "shortest_path": {
      // details contains { route: string[], cost: number, isValid: boolean }
      const { cost = 999, isValid = false } = details;

      if (!isValid) {
        score = Math.max(0, 10 - hintPenalty - attemptsPenalty);
        feedback = "Yo'nalish xaritada uzilgan yoki noto'g'ri bog'langan. Shaharlararo yo'llar bo'ylab harakatlaning.";
      } else if (cost === 24) {
        score = 100 - hintPenalty - attemptsPenalty;
        feedback = "Ajoyib! Siz eng arzon yo'lni topdingiz (qiymati: 24). Bu eng optimal yechim!";
      } else if (cost <= 26) {
        score = 80 - hintPenalty - attemptsPenalty;
        feedback = `Juda yaxshi! Topilgan yo'l narxi: ${cost}. Siz eng qisqa yo'nalishlardan birini aniqladingiz.`;
      } else if (cost <= 29) {
        score = 60 - hintPenalty - attemptsPenalty;
        feedback = `Yaxshi, yo'l topildi (narxi: ${cost}). Lekin bundan ham arzonroq yo'l mavjud.`;
      } else {
        score = 40 - hintPenalty - attemptsPenalty;
        feedback = `Yo'l topildi, lekin juda qimmat (narxi: ${cost}). Qadamlar soni kamligi har doim ham eng arzon yo'l degani emas.`;
      }
      score = Math.max(0, Math.min(100, score));
      break;
    }

    case "sliding_puzzle": {
      // details contains { solved: boolean, isOptimal: boolean, scrambleMoves: number, manhattanImprovementPercent: number }
      const { solved = false, scrambleMoves = 10, manhattanImprovementPercent = 0 } = details;

      if (solved) {
        if (movesCount <= scrambleMoves + 2) {
          score = 100;
        } else if (movesCount <= 20) {
          score = 80;
        } else if (movesCount <= 35) {
          score = 60;
        } else {
          score = 45;
        }
        score -= (hintPenalty + attemptsPenalty);
        score = Math.max(0, Math.min(100, score));
        feedback = `Sandiq tartiblandi! Siz buni ${movesCount} ta yurishda bajardingiz. Haqiqiy mantiq va rejalashtirish ustasi!`;
      } else {
        // Partial score based on Manhattan distance improvement
        const baseScore = Math.max(0, Math.round((manhattanImprovementPercent / 100) * 30));
        score = baseScore - hintPenalty - attemptsPenalty;
        score = Math.max(0, Math.min(100, score));
        feedback = `Sandiq to'liq tartiblanmadi. Bloklarni maqsadga moslab joylashtirishni rejalashtirishga harakat qiling.`;
      }
      break;
    }

    case "prime_detective": {
      // details contains { correct: boolean, isComposite: boolean, queriesUsed: number, foundFactor: boolean }
      const { correct = false, isComposite = false, queriesUsed = 0, foundFactor = false } = details;

      if (correct) {
        let baseScore = 60;
        let queryBonus = 0;
        let factorBonus = 0;

        if (isComposite && foundFactor) {
          factorBonus = 20;
        }

        if (queriesUsed >= 1 && queriesUsed <= 3) {
          queryBonus = 20;
        } else if (queriesUsed >= 4 && queriesUsed <= 6) {
          queryBonus = 12;
        } else if (queriesUsed >= 7 && queriesUsed <= 10) {
          queryBonus = 5;
        }

        score = baseScore + queryBonus + factorBonus - hintPenalty - attemptsPenalty;
        score = Math.max(0, Math.min(100, score));

        if (isComposite) {
          if (foundFactor) {
            feedback = `To'g'ri! Son tub emas, bo'luvchisini ham to'g'ri ko'rsatdingiz (${queriesUsed} ta so'rov orqali). Mukammal detektiv ishi!`;
          } else {
            feedback = `To'g'ri! Son tub emasligini aniqladingiz, lekin bo'luvchisini aniqlamadingiz (${queriesUsed} ta so'rov).`;
          }
        } else {
          feedback = `To'g'ri! Son tub ekanligini muvaffaqiyatli isbotladingiz (${queriesUsed} ta so'rov). Ildizgacha bo'lgan sonlarni tekshirish yetarli bo'ldi!`;
        }
      } else {
        // Wrong final answer
        score = Math.max(0, Math.min(20, 20 - hintPenalty - attemptsPenalty));
        feedback = "Noto'g'ri xulosa. Sonning tub yoki tub emasligi haqida xato qaror qabul qilindi. Bo'linish so'rovlaridan aqlliroq foydalaning.";
      }
      break;
    }

    default:
      score = 0;
      feedback = "Noma'lum masala.";
  }

  // Noto'g'ri urinishlar haqida izoh kiritish
  if (attemptsPenalty > 0 && feedback) {
    feedback += ` (Xato urinishlar jarimasi: -${attemptsPenalty} ball).`;
  }

  // Vaqtni reytingda inobatga olish: Har 45 soniya uchun 1 ball chegiriladi (maksimal 15 ball chegirma)
  // Bu tezkor va optimal yechgan foydalanuvchilarni rag'batlantiradi!
  const timePenalty = Math.min(15, Math.floor((input.timeSpentSeconds || 0) / 45));
  if (score > 20) {
    score = Math.max(20, score - timePenalty); // to'g'ri yechim bo'lsa, ball haddan tashqari tushib ketmaydi
  } else {
    score = Math.max(0, score - timePenalty);
  }

  return { score, feedback };
}

export function getGeneralFeedback(totalScore: number): { title: string; desc: string; learningPath: string } {
  if (totalScore >= 520) {
    return {
      title: "Ajoyib algoritmik fikrlash!",
      desc: "Sizda algoritmlarni his qilish va optimal yechimlarni topish qobiliyati juda yuqori darajada shakllangan.",
      learningPath: "AlgoCamp'da search, sorting va CP (sport dasturlash) masalalariga tezroq o'tishingiz mumkin.",
    };
  } else if (totalScore >= 420) {
    return {
      title: "Kuchli start!",
      desc: "Ko'plab murakkab masalalarga to'g'ri mantiqiy yondashuvlarni topa oldingiz. Yaxshi muhandislik salohiyati bor.",
      learningPath: "Sizga murakkabroq ma'lumotlar tuzilmalari, graf algoritmlari va rekursiyani chuqurroq o'rganish tavsiya etiladi.",
    };
  } else if (totalScore >= 300) {
    return {
      title: "Yaxshi potensial!",
      desc: "Sizda algoritmik fikrlash asosi mavjud, faqat ba'zi masalalarda optimal va tezkor yo'llarni tanlashda biroz tajriba yetishmadi.",
      learningPath: "O'rta murakkablikdagi masalalar, ikkilik qidiruv va dinamik dasturlash asoslarini ko'proq mashq qiling.",
    };
  } else if (totalScore >= 180) {
    return {
      title: "Boshlang'ich daraja, lekin qiziqish bor!",
      desc: "Masalalarni hal qilish uchun harakat qildingiz va ba'zi muhim mantiqiy bog'liqliklarni ilg'ab oldingiz.",
      learningPath: "Python foundation, asosiy sikllar, massivlar va sodda mantiqiy masalalardan boshlash tavsiya qilinadi.",
    };
  } else {
    return {
      title: "Asoslardan boshlash tavsiya qilinadi",
      desc: "Algoritmlarga birinchi qadamlar. Hali hamma narsa oldinda! Mantiq va dasturlash asoslari sizga yordam beradi.",
      learningPath: "Mantiqiy o'yinlar, scratch yoki Python boshlang'ich kurslari hamda algoritmlar haqidagi sodda kitoblardan boshlang.",
    };
  }
}
