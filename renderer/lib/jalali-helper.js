// lib/jalali-helper.js (Vanilla JS - بدون وابستگی)
window.JalaliHelper = (function() {
  // Reference: Kazimierz M. Borkowski algorithm
  function jalCal(jy) {
    // Returns year info: [number of leap years until jy-1, Gregorian start of year]
    let breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
                  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
    let bl = breaks.length;
    let gy = jy + 621;
    let leapJ = -14, jp = breaks[0], jm, jump, N;
    for (let i = 1; i < bl; i++) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ += (jump / 33) | 0;
      jp = jm;
    }
    N = jy - jp;
    if (N >= 0) {
      leapJ += (N / 33) | 0;
      let cycle = N % 33;
      if (cycle >= 4) leapJ++;
    }
    let leapG = ((gy / 4) | 0) - ((gy / 100) | 0) + ((gy / 400) | 0) - 1;
    let march = 20 + leapJ - leapG;
    return [leapJ, march];
  }

  function gregorianToJalali(gy, gm, gd) {
    let j = jalCal(gy - (gm < 3 ? 1 : 0));
    let march = j[1];
    let days = 0;
    const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    days += monthDays[gm - 1] + gd;
    if (gm > 2 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) days++;
    days -= march;
    if (days <= 0) {
      let prev = jalCal(gy - 1);
      days += prev[1] > 19 ? 366 : 365;
    }
    let jy = gy - 621 + (days > 186 ? 1 : 0);
    let jd = days > 186 ? days - 186 : days;
    let jm = 1;
    if (jd <= 31) { jm = 1; }
    else if (jd <= 62) { jm = 2; jd -= 31; }
    else if (jd <= 93) { jm = 3; jd -= 62; }
    else if (jd <= 124) { jm = 4; jd -= 93; }
    else if (jd <= 155) { jm = 5; jd -= 124; }
    else if (jd <= 186) { jm = 6; jd -= 155; }
    else if (jd <= 216) { jm = 7; jd -= 186; }
    else if (jd <= 246) { jm = 8; jd -= 216; }
    else if (jd <= 276) { jm = 9; jd -= 246; }
    else if (jd <= 306) { jm = 10; jd -= 276; }
    else if (jd <= 336) { jm = 11; jd -= 306; }
    else { jm = 12; jd -= 336; }
    return { year: jy, month: jm, day: jd };
  }

  function jalaliToGregorian(jy, jm, jd) {
    let [leap, march] = jalCal(jy);
    let days = jd;
    if (jm > 1) days += 31;
    if (jm > 2) days += 31;
    if (jm > 3) days += 31;
    if (jm > 4) days += 31;
    if (jm > 5) days += 31;
    if (jm > 6) days += 31;
    if (jm > 7) days += 30;
    if (jm > 8) days += 30;
    if (jm > 9) days += 30;
    if (jm > 10) days += 30;
    if (jm > 11) days += 30;
    days += march - 1;
    let gy = jy + 621;
    let monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) monthDays[1] = 29;
    let gm = 1;
    while (days > monthDays[gm - 1]) {
      days -= monthDays[gm - 1];
      gm++;
    }
    return { year: gy, month: gm, day: days };
  }

  function formatJalali(y, m, d) {
    return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
  }

  function todayJalali() {
    const now = new Date();
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  return { gregorianToJalali, jalaliToGregorian, formatJalali, todayJalali };
})();