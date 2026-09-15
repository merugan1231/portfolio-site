import Foundation
import AppKit
import CoreGraphics
import CoreText

// Покадровый анимационный рендер обзора DevShelf v2.
// Кадры подаются на stdin ffmpeg'а (rawvideo BGRA) — сборка в один проход.
// Эффекты: fade/slide-входы с overshoot, typewriter, счётчики, пульсации,
// луч сканирования, кен-бёрнс-зум, штрих-чарт, sweep-подсветка, вспышки.

let W = 1920, H = 1080, FPS = 30.0

func die(_ m: String) -> Never { FileHandle.standardError.write("FATAL: \(m)\n".data(using: .utf8)!); exit(1) }
func col(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: a)
}
func sh(_ c: CGColor, _ a: CGFloat) -> CGColor { c.copy(alpha: a)! }

let BG = col(0x0b0c10), PANEL = col(0x14161d), WHITE = col(0xffffff)
let DIM = col(0x9ca3af), SUB = col(0xd1d5db)
let INDIGO = col(0x6366f1), VIOLET = col(0x8b5cf6), LIME = col(0xa3e635), AMBER = col(0xfbbf24), CYAN = col(0x67e8f9)

let FONT = NSFont.boldSystemFont(ofSize: 40)
let FONT_R = NSFont.systemFont(ofSize: 40)

// ---- easing ----
func clamp01(_ v: Double) -> Double { min(1, max(0, v)) }
func easeOut(_ t: Double) -> CGFloat { CGFloat(1 - pow(1 - clamp01(t), 3)) }
func easeInOut(_ t: Double) -> CGFloat { let x = clamp01(t); return CGFloat(x < 0.5 ? 2*x*x : 1 - pow(-2*x + 2, 2)/2) }
func overshoot(_ t: Double) -> CGFloat {
    let x = clamp01(t); let c1 = 1.70158, c3 = c1 + 1
    return CGFloat(1 + c3 * pow(x - 1, 3) + c1 * pow(x - 1, 2))
}

func drawText(_ ctx: CGContext, _ s: String, x: CGFloat, y: CGFloat, size: CGFloat, color: CGColor, alpha: CGFloat = 1, bold: Bool = true) {
    guard alpha > 0.01 else { return }
    let attr: [NSAttributedString.Key: Any] = [
        .font: (bold ? FONT : FONT_R).withSize(size),
        .foregroundColor: NSColor(cgColor: sh(color, alpha)) ?? .white,
    ]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: s, attributes: attr))
    ctx.saveGState()
    ctx.setAlpha(alpha)
    ctx.textPosition = CGPoint(x: x, y: y)
    CTLineDraw(line, ctx)
    ctx.restoreGState()
}

func textW(_ s: String, size: CGFloat, bold: Bool = true) -> CGFloat {
    let attr: [NSAttributedString.Key: Any] = [.font: (bold ? FONT : FONT_R).withSize(size)]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: s, attributes: attr))
    return CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
}
func centered(_ ctx: CGContext, _ s: String, cx: CGFloat, y: CGFloat, size: CGFloat, color: CGColor, alpha: CGFloat = 1, bold: Bool = true) {
    drawText(ctx, s, x: cx - textW(s, size: size, bold: bold)/2, y: y, size: size, color: color, alpha: alpha, bold: bold)
}

func glow(_ ctx: CGContext, cx: CGFloat, cy: CGFloat, r: CGFloat, color: CGColor, alpha: CGFloat = 1) {
    guard alpha > 0.01 else { return }
    let steps = 18
    for i in (1...steps).reversed() {
        let t = CGFloat(i) / CGFloat(steps)
        ctx.setFillColor(sh(color, (1 - t) * 0.5 * alpha))
        ctx.fillEllipse(in: CGRect(x: cx - r*t, y: cy - r*t, width: r*t*2, height: r*t*2))
    }
}

func grid(_ ctx: CGContext, alpha: CGFloat) {
    ctx.setStrokeColor(col(0xffffff, 0.045 * alpha)); ctx.setLineWidth(1)
    let step: CGFloat = 96
    var x: CGFloat = 0
    while x <= CGFloat(W) { ctx.move(to: CGPoint(x: x, y: 0)); ctx.addLine(to: CGPoint(x: x, y: CGFloat(H))); x += step }
    var y: CGFloat = 0
    while y <= CGFloat(H) { ctx.move(to: CGPoint(x: 0, y: y)); ctx.addLine(to: CGPoint(x: CGFloat(W), y: y)); y += step }
    ctx.strokePath()
}

func panel(_ ctx: CGContext, _ r: CGRect, radius: CGFloat, fill: CGColor, stroke: CGColor? = nil, lw: CGFloat = 2, alpha: CGFloat = 1) {
    guard alpha > 0.01 else { return }
    let p = CGPath(roundedRect: r, cornerWidth: radius, cornerHeight: radius, transform: nil)
    ctx.saveGState(); ctx.setAlpha(alpha)
    ctx.addPath(p); ctx.setFillColor(fill); ctx.fillPath()
    if let st = stroke { ctx.addPath(p); ctx.setStrokeColor(st); ctx.setLineWidth(lw); ctx.strokePath() }
    ctx.restoreGState()
}

func base(_ ctx: CGContext, t: CGFloat) {
    ctx.setFillColor(BG); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
    // дрейфующие свечения
    glow(ctx, cx: CGFloat(W)/2 + CGFloat(sin(Double(t)*0.7))*60, cy: CGFloat(H)+140, r: 780, color: INDIGO, alpha: 0.2)
    glow(ctx, cx: CGFloat(W)-180 + CGFloat(cos(Double(t)*0.5))*40, cy: CGFloat(H)-140, r: 430, color: VIOLET, alpha: 0.11)
    glow(ctx, cx: 160 - CGFloat(sin(Double(t)*0.4))*40, cy: 200, r: 370, color: LIME, alpha: 0.05)
    grid(ctx, alpha: 1)
}

func star(_ ctx: CGContext, cx: CGFloat, cy: CGFloat, r: CGFloat, filled: Bool, alpha: CGFloat = 1) {
    guard alpha > 0.01 else { return }
    let path = CGMutablePath()
    for i in 0..<10 {
        let ang = CGFloat(i) * .pi / 5 - .pi / 2
        let rr = i % 2 == 0 ? r : r * 0.42
        let pt = CGPoint(x: cx + rr*cos(ang), y: cy + rr*sin(ang))
        if i == 0 { path.move(to: pt) } else { path.addLine(to: pt) }
    }
    path.closeSubpath()
    ctx.saveGState(); ctx.setAlpha(alpha)
    ctx.addPath(path); ctx.setFillColor(filled ? AMBER : col(0x3f3f46)); ctx.fillPath()
    ctx.addPath(path); ctx.setStrokeColor(sh(AMBER, 0.9)); ctx.setLineWidth(2); ctx.strokePath()
    ctx.restoreGState()
}

func progress(_ ctx: CGContext, p: CGFloat) {
    ctx.setFillColor(sh(WHITE, 0.12))
    ctx.fill(CGRect(x: 0, y: CGFloat(H)-6, width: CGFloat(W), height: 6))
    ctx.setFillColor(sh(LIME, 0.9))
    ctx.fill(CGRect(x: 0, y: CGFloat(H)-6, width: CGFloat(W)*p, height: 6))
}

func typewriter(_ s: String, _ p: Double) -> String {
    let n = Int(Double(s.count) * clamp01(p))
    let idx = s.index(s.startIndex, offsetBy: min(n, s.count))
    return String(s[..<idx])
}

// ============ Сцены: t = локальное время (сек), T = длительность ============
typealias Scene = (CGContext, Double, Double) -> Void

let scenes: [(Double, Scene)] = [
    // 0. Титул: полка въезжает, буквы typewriter, галочки вылетают
    (7.0, { ctx, t, T in
        base(ctx, t: t)
        let p = easeOut(t/1.0)
        centered(ctx, typewriter("DEVSHELF", Double(t/1.4)), cx: CGFloat(W)/2, y: 830, size: 130, color: WHITE)
        centered(ctx, "Портфолио с подтверждённым авторством", cx: CGFloat(W)/2, y: 720, size: 40, color: SUB, alpha: easeOut((t-0.9)/0.6))
        let shelfP = easeOut(t/1.1)
        let y = 300 - CGFloat(1-shelfP)*120
        ctx.setFillColor(sh(WHITE, 0.08)); ctx.fill(CGRect(x: 440, y: y-26, width: 1240, height: 16))
        let labels = ["Сайт", "Бот", "OSINT", "Дизайн"]
        let cols = [INDIGO, VIOLET, LIME, CYAN]
        for i in 0..<4 {
            let d = Double(i)*0.18
            let ap = overshoot((t-d)/0.7)
            let cx = 630 + CGFloat(i)*300
            panel(ctx, CGRect(x: cx-110, y: y+20, width: 220, height: 150), radius: 18,
                  fill: sh(PANEL, 0.97), stroke: sh(WHITE, 0.14), alpha: clamp01(Double(ap)))
            glow(ctx, cx: cx, cy: y+95, r: 46, color: cols[i], alpha: CGFloat(clamp01(Double(ap)))*0.3)
            panel(ctx, CGRect(x: cx-34, y: y+60, width: 68, height: 68), radius: 14, fill: sh(cols[i], 0.85), alpha: clamp01(Double(ap)))
            drawText(ctx, labels[i], x: cx-96, y: y+32, size: 20, color: DIM, alpha: easeOut((t-d-0.2)/0.4))
            // галочка с задержкой
            let cp = clamp01((t-d-0.5)/0.3)
            if cp > 0 {
                ctx.setStrokeColor(LIME); ctx.setLineWidth(5)
                ctx.move(to: CGPoint(x: cx+78, y: y+150)); ctx.addLine(to: CGPoint(x: cx+78+16*CGFloat(cp), y: y+150-16*CGFloat(cp)))
                if cp > 0.5 { ctx.addLine(to: CGPoint(x: cx+78+16+26*((cp-0.5)*2), y: y+150-16+30*((cp-0.5)*2))) }
                ctx.strokePath()
            }
        }
    }),
    // 1. Авторство: код печатается, луч ездит, щит пульсирует, галочка рисуется
    (10.5, { ctx, t, T in
        base(ctx, t: t)
        panel(ctx, CGRect(x: 300, y: 250, width: 660, height: 440), radius: 28, fill: sh(PANEL, 0.97), stroke: sh(WHITE, 0.14))
        let lines = ["import { verify } from core", "const code = DEV-VERIFY", "await verify(repo.url)", "// авторство найдено", "return verified(100%)"]
        for i in 0..<lines.count {
            let lp = clamp01((t - 0.5 - Double(i)*0.45)/0.45)
            drawText(ctx, typewriter(lines[i], Double(lp)), x: 340, y: 600 - CGFloat(i)*52, size: 26, color: i == 4 ? LIME : SUB, alpha: lp > 0 ? 1 : 0, bold: false)
        }
        // сканирующий луч
        let beamX = 620 + CGFloat(sin(Double(t)*1.6))*180
        ctx.setFillColor(sh(LIME, 0.10)); ctx.fill(CGRect(x: beamX, y: 250, width: 130, height: 440))
        // щит с пульсом
        let pulse = 1 + CGFloat(sin(Double(t)*3))*0.03
        ctx.saveGState(); ctx.translateBy(x: 1230, y: 520); ctx.scaleBy(x: pulse*easeOut(t/0.8), y: pulse*easeOut(t/0.8))
        let shield = CGMutablePath()
        shield.move(to: CGPoint(x: 0, y: 180)); shield.addLine(to: CGPoint(x: 190, y: 120)); shield.addLine(to: CGPoint(x: 190, y: -60))
        shield.addLine(to: CGPoint(x: 0, y: -190)); shield.addLine(to: CGPoint(x: -190, y: -60)); shield.addLine(to: CGPoint(x: -190, y: 120)); shield.closeSubpath()
        ctx.addPath(shield); ctx.setFillColor(sh(LIME, 0.13)); ctx.fillPath()
        ctx.addPath(shield); ctx.setStrokeColor(LIME); ctx.setLineWidth(6); ctx.strokePath()
        let cp = clamp01((t-1.2)/0.5)
        ctx.setStrokeColor(LIME); ctx.setLineWidth(16)
        ctx.move(to: CGPoint(x: -80, y: 0)); ctx.addLine(to: CGPoint(x: -80+65*CGFloat(cp), y: -65*CGFloat(cp)))
        if cp > 0.55 { ctx.addLine(to: CGPoint(x: -15+120*((cp-0.55)/0.45), y: -65+125*((cp-0.55)/0.45))) }
        ctx.strokePath()
        ctx.restoreGState()
        centered(ctx, "Авторство подтверждается автоматически", cx: CGFloat(W)/2, y: 150, size: 46, color: WHITE, alpha: easeOut((t-1.6)/0.6))
    }),
    // 2. ID-карта: карта вылетает, цифры счётчиком
    (9.6, { ctx, t, T in
        base(ctx, t: t)
        let ap = overshoot(t/0.9)
        ctx.saveGState()
        ctx.translateBy(x: CGFloat(W)/2, y: 520)
        ctx.scaleBy(x: CGFloat(clamp01(ap)), y: CGFloat(clamp01(ap)))
        ctx.rotate(by: CGFloat((1-clamp01(easeOut(t/0.9))) * -0.12))
        panel(ctx, CGRect(x: -400, y: -220, width: 800, height: 440), radius: 32, fill: sh(PANEL, 0.97), stroke: sh(INDIGO, 0.6), lw: 3)
        glow(ctx, cx: -240, cy: 80, r: 110, color: INDIGO, alpha: 0.3)
        ctx.setFillColor(sh(INDIGO, 0.9)); ctx.fillEllipse(in: CGRect(x: -300, y: 20, width: 120, height: 120))
        drawText(ctx, "🧑‍💻", x: -288, y: 40, size: 76, color: WHITE)
        panel(ctx, CGRect(x: -80, y: 40, width: 330, height: 34), radius: 10, fill: sh(WHITE, 0.16))
        panel(ctx, CGRect(x: -80, y: -20, width: 240, height: 30), radius: 10, fill: sh(WHITE, 0.1))
        panel(ctx, CGRect(x: -320, y: -160, width: 560, height: 44), radius: 14, fill: sh(WHITE, 0.05), stroke: sh(LIME, 0.5))
        let idP = clamp01((t-0.6)/0.8)
        let idVal = Int(1 * easeOut(idP))
        drawText(ctx, "ID  \(idVal)", x: -280, y: -148, size: 30, color: LIME)
        drawText(ctx, "СОЗДАТЕЛЬ", x: -140, y: -144, size: 24, color: DIM)
        ctx.restoreGState()
        centered(ctx, "Постоянный цифровой ID у каждого", cx: CGFloat(W)/2, y: 170, size: 44, color: WHITE, alpha: easeOut((t-1.1)/0.6))
    }),
    // 3. Звёзды: заполняются по одной с отскоком, свечение дышит
    (7.0, { ctx, t, T in
        base(ctx, t: t)
        let breathe = 1 + CGFloat(sin(Double(t)*2.2))*0.04
        glow(ctx, cx: CGFloat(W)/2, cy: 620, r: 330*breathe, color: AMBER, alpha: 0.13)
        for i in 0..<5 {
            let ap = overshoot((t - Double(i)*0.28)/0.5)
            star(ctx, cx: CGFloat(560+i*170), cy: 620, r: 64*CGFloat(clamp01(ap)), filled: true, alpha: clamp01(Double(ap)))
        }
        centered(ctx, "Честные оценки со спорами", cx: CGFloat(W)/2, y: 440, size: 46, color: WHITE, alpha: easeOut((t-1.4)/0.6))
        centered(ctx, "Низкие — только с обоснованием", cx: CGFloat(W)/2, y: 370, size: 28, color: DIM, alpha: easeOut((t-1.8)/0.6))
    }),
    // 4. Люди: узел растёт, луч поиска ходит по аватарам
    (9.6, { ctx, t, T in
        base(ctx, t: t)
        let pts: [(CGFloat, CGFloat)] = [(560, 640), (860, 520), (1160, 660), (1400, 480)]
        for i in 0..<pts.count {
            for j in (i+1)..<pts.count {
                let lp = clamp01((t - 0.3 - Double(i+j)*0.15)/0.4)
                if lp <= 0 { continue }
                ctx.setStrokeColor(sh(INDIGO, 0.35*CGFloat(lp))); ctx.setLineWidth(2)
                let x1 = pts[i].0, y1 = pts[i].1
                ctx.move(to: CGPoint(x: x1, y: y1))
                ctx.addLine(to: CGPoint(x: x1+(pts[j].0-x1)*CGFloat(lp), y: y1+(pts[j].1-y1)*CGFloat(lp)))
                ctx.strokePath()
            }
        }
        let hi = Int(t*0.8) % 4
        for (i, p) in pts.enumerated() {
            let ap = overshoot((t - Double(i)*0.2)/0.5)
            if ap <= 0 { continue }
            glow(ctx, cx: p.0, cy: p.1, r: 84, color: i == hi ? CYAN : INDIGO, alpha: CGFloat(clamp01(Double(ap)))*(i == hi ? 0.5 : 0.28))
            ctx.setFillColor(sh(i == hi ? CYAN : INDIGO, 0.95))
            let s = 92*CGFloat(clamp01(Double(ap)))
            ctx.fillEllipse(in: CGRect(x: p.0-s/2, y: p.1-s/2, width: s, height: s))
        }
        centered(ctx, "Поиск по ID, роли и специфике", cx: CGFloat(W)/2, y: 250, size: 44, color: WHITE, alpha: easeOut((t-1.3)/0.6))
    }),
    // 5. Витрина: карточки выпадают каскадом
    (7.0, { ctx, t, T in
        base(ctx, t: t)
        let hs: [CGFloat] = [300, 380, 260, 340, 280, 320]
        let cols = [INDIGO, LIME, VIOLET, CYAN, AMBER, INDIGO]
        for i in 0..<6 {
            let x = CGFloat(200 + (i%3)*540), yBase = CGFloat(i < 3 ? 470 : 200)
            let ap = overshoot((t - Double(i)*0.14)/0.6)
            if ap <= 0.02 { continue }
            let drop = (1-CGFloat(clamp01(Double(ap))))*160
            panel(ctx, CGRect(x: x, y: yBase-drop, width: 460, height: hs[i]), radius: 24, fill: sh(PANEL, 0.96), stroke: sh(WHITE, 0.12), alpha: clamp01(Double(ap)))
            panel(ctx, CGRect(x: x+30, y: yBase-drop+hs[i]-110, width: hs[i] > 340 ? 400 : 300, height: 50), radius: 12, fill: sh(cols[i], 0.5), alpha: clamp01(Double(ap)))
            panel(ctx, CGRect(x: x+30, y: yBase-drop+hs[i]-180, width: 380, height: 40), radius: 10, fill: sh(WHITE, 0.14), alpha: clamp01(Double(ap)))
        }
        centered(ctx, "Витрина-галерея сообщества", cx: CGFloat(W)/2, y: 990, size: 42, color: WHITE, alpha: easeOut((t-1.2)/0.6))
    }),
    // 6. Админка: вкладки появляются, активная мигает подсветкой
    (8.0, { ctx, t, T in
        base(ctx, t: t)
        let tabs = ["Модерация", "Пользователи", "Споры", "Тикеты", "Оплаты", "Промокоды", "Юзернеймы"]
        let active = 1
        for i in 0..<7 {
            let colI = i%2, rowI = i/2
            let x = CGFloat(420+colI*560), y = CGFloat(760-rowI*165)
            let ap = overshoot((t - Double(i)*0.12)/0.55)
            if ap <= 0.02 { continue }
            let isActive = i == active
            let flash = isActive ? CGFloat(0.75 + sin(Double(t)*4)*0.1) : 1
            panel(ctx, CGRect(x: x, y: y, width: 500, height: 125), radius: 20,
                  fill: sh(isActive ? INDIGO : PANEL, isActive ? 0.85 : 0.96),
                  stroke: sh(isActive ? INDIGO : WHITE, isActive ? 1 : 0.12), alpha: clamp01(Double(ap))*CGFloat(flash))
            drawText(ctx, tabs[i], x: x+36, y: y+50, size: 32, color: isActive ? WHITE : SUB, alpha: clamp01(Double(ap)))
        }
        centered(ctx, "Админка на 7 вкладок", cx: CGFloat(W)/2, y: 120, size: 44, color: WHITE, alpha: easeOut((t-1.0)/0.6))
    }),
    // 7. PRO: корона опускается с блеском, цена счётчиком 0→499
    (6.0, { ctx, t, T in
        base(ctx, t: t)
        glow(ctx, cx: CGFloat(W)/2, cy: 560, r: 260, color: AMBER, alpha: 0.16 + CGFloat(sin(Double(t)*3))*0.04)
        let cp = easeOut(t/1.0)
        ctx.saveGState(); ctx.translateBy(x: 0, y: (1-cp)*160)
        let cr = CGMutablePath()
        cr.move(to: CGPoint(x: 760, y: 640)); cr.addLine(to: CGPoint(x: 820, y: 500)); cr.addLine(to: CGPoint(x: 920, y: 590))
        cr.addLine(to: CGPoint(x: 960, y: 440)); cr.addLine(to: CGPoint(x: 1000, y: 590)); cr.addLine(to: CGPoint(x: 1100, y: 500))
        cr.addLine(to: CGPoint(x: 1160, y: 640)); cr.closeSubpath()
        ctx.addPath(cr); ctx.setFillColor(sh(AMBER, 0.9)); ctx.fillPath()
        panel(ctx, CGRect(x: 760, y: 560, width: 400, height: 46), radius: 12, fill: sh(AMBER, 0.75))
        ctx.restoreGState()
        panel(ctx, CGRect(x: 660, y: 300, width: 600, height: 60), radius: 18, fill: sh(PANEL, 0.97), stroke: sh(AMBER, 0.5))
        drawText(ctx, "PRO", x: 720, y: 320, size: 34, color: AMBER)
        let price = Int(499 * easeOut(clamp01((t-0.8)/1.2)))
        drawText(ctx, "\(price) ₽/мес", x: 860, y: 320, size: 34, color: WHITE)
        centered(ctx, "Безлимит работ и значок Pro", cx: CGFloat(W)/2, y: 170, size: 44, color: WHITE, alpha: easeOut((t-1.5)/0.6))
    }),
    // 8. Стек: слои поднимаются, счётчик 0 ₽
    (7.2, { ctx, t, T in
        base(ctx, t: t)
        let layers: [(CGFloat, String, CGColor)] = [(320, "База данных", VIOLET), (500, "Приложение", INDIGO), (680, "Облако", LIME)]
        for (i, l) in layers.enumerated() {
            let ap = easeOut((t - Double(i)*0.3)/0.7)
            if ap <= 0.02 { continue }
            let y = l.0 - (1-ap)*80
            ctx.saveGState()
            ctx.translateBy(x: CGFloat(W)/2, y: y)
            ctx.concatenate(CGAffineTransform(scaleX: 1, y: 0.42))
            ctx.setFillColor(sh(l.2, 0.22*ap)); ctx.setStrokeColor(sh(l.2, 0.8*ap)); ctx.setLineWidth(3)
            ctx.fillEllipse(in: CGRect(x: -430, y: -130, width: 860, height: 260))
            ctx.strokeEllipse(in: CGRect(x: -430, y: -130, width: 860, height: 260))
            ctx.restoreGState()
            drawText(ctx, l.1, x: CGFloat(W)/2 - textW(l.1, size: 26)/2, y: y+24, size: 26, color: SUB, alpha: ap)
        }
        centered(ctx, "Next.js · React · PostgreSQL", cx: CGFloat(W)/2, y: 150, size: 42, color: WHITE, alpha: easeOut((t-1.2)/0.6))
        let zp = clamp01((t-1.6)/0.8)
        centered(ctx, typewriter("Расходы: 0 ₽/мес", Double(zp)), cx: CGFloat(W)/2, y: 85, size: 30, color: LIME)
    }),
    // 9. Финал: свободное место пульсирует, домен печатается
    (7.0, { ctx, t, T in
        base(ctx, t: t)
        ctx.setFillColor(sh(WHITE, 0.08)); ctx.fill(CGRect(x: 620, y: 394, width: 900, height: 16))
        let labels = ["Ваша", "работа", "здесь"]
        let cols = [INDIGO, VIOLET, LIME]
        for i in 0..<3 {
            let ap = overshoot((t - Double(i)*0.15)/0.6)
            let cx = 770 + CGFloat(i)*300
            panel(ctx, CGRect(x: cx-110, y: 440, width: 220, height: 150), radius: 18, fill: sh(PANEL, 0.97), stroke: sh(WHITE, 0.14), alpha: clamp01(Double(ap)))
            glow(ctx, cx: cx, cy: 515, r: 46, color: cols[i], alpha: CGFloat(clamp01(Double(ap)))*0.3)
            drawText(ctx, labels[i], x: cx-90, y: 452, size: 20, color: DIM, alpha: easeOut((t-Double(i)*0.15-0.2)/0.4))
        }
        let pulse = 1 + CGFloat(sin(Double(t)*2.5))*0.06
        glow(ctx, cx: 1570, cy: 515, r: 120*pulse, color: LIME, alpha: 0.2)
        panel(ctx, CGRect(x: 1450, y: 440, width: 220, height: 150), radius: 18, fill: sh(WHITE, 0.03), stroke: sh(LIME, 0.6), lw: 3)
        centered(ctx, "Покажи, как ты это сделал", cx: CGFloat(W)/2, y: 250, size: 46, color: WHITE, alpha: easeOut((t-0.8)/0.6))
        centered(ctx, typewriter("merugan.is-a.dev", Double((t-1.3)/1.2)), cx: CGFloat(W)/2, y: 170, size: 34, color: LIME)
        let cursor = Int(t*2)%2 == 0 && t < 3.2 ? "|" : " "
        drawText(ctx, cursor, x: CGFloat(W)/2 + textW("merugan.is-a.dev", size: 34)/2 + 10, y: 170, size: 34, color: LIME)
    }),
]

// ============ Рендер в ffmpeg ============
let durations: [Double]
do { durations = try JSONDecoder().decode([Double].self, from: Data(contentsOf: URL(fileURLWithPath: "/tmp/vg2/durations.json"))) } catch { die("durations.json: \(error)") }
let total = durations.reduce(0, +)
let totalFrames = Int(total * FPS)
FileHandle.standardError.write("total \(total)s, frames \(totalFrames)\n".data(using: .utf8)!)

let ffmpeg = Process()
ffmpeg.executableURL = URL(fileURLWithPath: "/tmp/animbuild/ffmpeg")
ffmpeg.arguments = [
    "-y", "-loglevel", "error",
    "-f", "rawvideo", "-pix_fmt", "bgra", "-s", "\(W)x\(H)", "-r", "\(Int(FPS))", "-i", "-",
    "-i", "/tmp/vg2/mix.wav",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k",
    "-shortest",
    NSString(string: "~/Desktop/DEVSHELF-обзор.mp4").expandingTildeInPath,
]
let inPipe = Pipe()
ffmpeg.standardInput = inPipe
if #available(macOS 10.13, *) { try! ffmpeg.run() } else { die("macos") }

let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
var frame = 0
var acc = 0.0
var sceneIdx = 0

while frame < totalFrames {
    let time = Double(frame) / FPS
    // найти сцену
    while sceneIdx < durations.count - 1 && time >= acc + durations[sceneIdx] {
        acc += durations[sceneIdx]; sceneIdx += 1
    }
    let local = time - acc
    let T = durations[sceneIdx]

    guard let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W*4,
                              space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { die("ctx") }
    // вход/выход сцены: fade 0.35s
    let fadeIn = clamp01(local/0.35)
    let fadeOut = clamp01((T-local)/0.35)
    ctx.setAlpha(CGFloat(min(fadeIn, fadeOut) == 0 ? 0.0 : 1))
    scenes[sceneIdx].1(ctx, local, T)
    progress(ctx, p: CGFloat(time/total))

    guard let data = ctx.data else { die("no data") }
    let buf = UnsafeBufferPointer(start: data.assumingMemoryBound(to: UInt8.self), count: W*H*4)
    var out = Data(count: W*H*4)
    out.withUnsafeMutableBytes { dst in
        memcpy(dst.baseAddress, buf.baseAddress, W*H*4)
    }
    inPipe.fileHandleForWriting.write(out)
    frame += 1
    if frame % 150 == 0 { FileHandle.standardError.write("frame \(frame)/\(totalFrames)\n".data(using: .utf8)!) }
}
inPipe.fileHandleForWriting.closeFile()
ffmpeg.waitUntilExit()
FileHandle.standardError.write("DONE \(ffmpeg.terminationStatus)\n".data(using: .utf8)!)
