import Foundation
import AppKit
import CoreGraphics
import CoreText
import ImageIO


// Рендер 10 слайдов 1920x1080 в стиле DevShelf (графит + индиго + лайм).
// Каждый слайд: тёмный градиентный фон, декоративная сетка, свечение,
// крупная понятная композиция из фигур и ЧЁТКИЕ русские подписи.
let W = 1920, H = 1080

func die(_ m: String) -> Never { FileHandle.standardError.write("FATAL: \(m)\n".data(using: .utf8)!); exit(1) }
func col(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: a)
}
func sh(_ c: CGColor, _ a: CGFloat) -> CGColor { c.copy(alpha: a)! }

let BG = col(0x0b0c10), PANEL = col(0x14161d), WHITE = col(0xffffff)
let DIM = col(0x9ca3af), SUB = col(0xd1d5db)
let INDIGO = col(0x6366f1), VIOLET = col(0x8b5cf6), LIME = col(0xa3e635), AMBER = col(0xfbbf24)
let CYAN = col(0x67e8f9)

let FONT = CTFontCreateWithName("Helvetica" as CFString, 40, nil) // системный шрифт с кириллицей
let FONT_B = CTFontCreateWithName("Helvetica-Bold" as CFString, 40, nil)

func text(_ ctx: CGContext, _ s: String, x: CGFloat, y: CGFloat, size: CGFloat, color: CGColor, align: NSTextAlignment = .left, bold: Bool = false) {
    let font = (bold ? FONT_B : FONT) as NSFont
    let para = NSMutableParagraphStyle(); para.alignment = align
    let attr: [NSAttributedString.Key: Any] = [
        .font: font.withSize(size), .foregroundColor: NSColor(cgColor: color) ?? NSColor.white, .paragraphStyle: para,
    ]
    let str = NSAttributedString(string: s, attributes: attr)
    let line = CTLineCreateWithAttributedString(str)
    ctx.textPosition = CGPoint(x: x, y: y)
    CTLineDraw(line, ctx)
}

func textW(_ s: String, size: CGFloat, bold: Bool = false) -> CGFloat {
    let font = ((bold ? FONT_B : FONT) as NSFont).withSize(size)
    let attr = [NSAttributedString.Key.font: font]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: s, attributes: attr))
    return CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
}

func centered(_ ctx: CGContext, _ s: String, cx: CGFloat, y: CGFloat, size: CGFloat, color: CGColor, bold: Bool = false) {
    text(ctx, s, x: cx - textW(s, size: size, bold: bold) / 2, y: y, size: size, color: color, bold: bold)
}

func glowCircle(_ ctx: CGContext, cx: CGFloat, cy: CGFloat, r: CGFloat, color: CGColor) {
    let rect = CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)
    ctx.saveGState()
    ctx.setFillColor(color)
    ctx.clip(to: rect)
    let comps: [CGFloat] = [0, 0, 0, 0]
    _ = comps
    // мягкое свечение: концентрические окружности с падающей альфой
    let steps = 24
    let base = color.alpha
    for i in (1...steps).reversed() {
        let t = CGFloat(i) / CGFloat(steps)
        let c = color.copy(alpha: base * (1 - t) * 0.5)!
        ctx.setFillColor(c)
        ctx.fillEllipse(in: CGRect(x: cx - r * t, y: cy - r * t, width: r * t * 2, height: r * t * 2))
    }
    ctx.restoreGState()
}

func grid(_ ctx: CGContext, alpha: CGFloat) {
    ctx.setStrokeColor(col(0xffffff, alpha))
    ctx.setLineWidth(1)
    let step: CGFloat = 96
    var x: CGFloat = 0
    while x <= CGFloat(W) { ctx.move(to: CGPoint(x: x, y: 0)); ctx.addLine(to: CGPoint(x: x, y: CGFloat(H))); x += step }
    var y: CGFloat = 0
    while y <= CGFloat(H) { ctx.move(to: CGPoint(x: 0, y: y)); ctx.addLine(to: CGPoint(x: CGFloat(W), y: y)); y += step }
    ctx.strokePath()
}

func rounded(_ ctx: CGContext, _ r: CGRect, radius: CGFloat, fill: CGColor, stroke: CGColor? = nil, lw: CGFloat = 2) {
    let p = CGPath(roundedRect: r, cornerWidth: radius, cornerHeight: radius, transform: nil)
    ctx.addPath(p); ctx.setFillColor(fill); ctx.fillPath()
    if let st = stroke { ctx.addPath(p); ctx.setStrokeColor(st); ctx.setLineWidth(lw); ctx.strokePath() }
}

func base(_ ctx: CGContext) {
    ctx.setFillColor(BG); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
    // верхнее индиго-свечение
    glowCircle(ctx, cx: CGFloat(W) / 2, cy: CGFloat(H) + 120, r: 760, color: sh(INDIGO, 0.22))
    glowCircle(ctx, cx: CGFloat(W) - 180, cy: CGFloat(H) - 140, r: 420, color: sh(VIOLET, 0.12))
    glowCircle(ctx, cx: 160, cy: 200, r: 360, color: sh(LIME, 0.05))
    grid(ctx, alpha: 0.045)
}

func star(_ ctx: CGContext, cx: CGFloat, cy: CGFloat, r: CGFloat, filled: Bool) {
    let path = CGMutablePath()
    for i in 0..<10 {
        let ang = CGFloat(i) * .pi / 5 - .pi / 2
        let rr = i % 2 == 0 ? r : r * 0.42
        let pt = CGPoint(x: cx + rr * cos(ang), y: cy + rr * sin(ang))
        if i == 0 { path.move(to: pt) } else { path.addLine(to: pt) }
    }
    path.closeSubpath()
    ctx.addPath(path)
    ctx.setFillColor(filled ? AMBER : col(0x3f3f46))
    ctx.fillPath()
    ctx.addPath(path)
    ctx.setStrokeColor(sh(AMBER, filled ? 0.9 : 0.35))
    ctx.setLineWidth(2)
    ctx.strokePath()
}

func shelf(_ ctx: CGContext, y: CGFloat, count: Int, x0: CGFloat, spacing: CGFloat, labels: [String]) {
    // полка
    rounded(ctx, CGRect(x: x0 - 40, y: y - 26, width: spacing * CGFloat(count) + 40, height: 16), radius: 8, fill: sh(WHITE, 0.08))
    for i in 0..<count {
        let cx = x0 + spacing * CGFloat(i) + spacing / 2 - 30
        let card = CGRect(x: cx - 110, y: y + 20, width: 220, height: 150)
        rounded(ctx, card, radius: 18, fill: sh(PANEL, 0.96), stroke: sh(WHITE, 0.14))
        // мини-превью внутри карточки
        let colors: [CGColor] = [INDIGO, VIOLET, LIME, CYAN, AMBER]
        let c = colors[i % colors.count]
        glowCircle(ctx, cx: cx, cy: y + 95, r: 46, color: sh(c, 0.25))
        rounded(ctx, CGRect(x: cx - 34, y: y + 60, width: 68, height: 68), radius: 14, fill: sh(c, 0.85))
        if i < labels.count {
            text(ctx, labels[i], x: cx - 100, y: y + 32, size: 20, color: DIM)
        }
        // галочка верификации
        ctx.setStrokeColor(LIME); ctx.setLineWidth(4)
        ctx.move(to: CGPoint(x: cx + 78, y: y + 150)); ctx.addLine(to: CGPoint(x: cx + 92, y: y + 136)); ctx.addLine(to: CGPoint(x: cx + 116, y: y + 164))
        ctx.strokePath()
    }
}

// ============ Сцены ============
let slides: [(String, (CGContext) -> Void)] = [
    ("00", { ctx in
        base(ctx)
        centered(ctx, "DEVSHELF", cx: CGFloat(W) / 2, y: 820, size: 120, color: WHITE, bold: true)
        centered(ctx, "Портфолио с подтверждённым авторством", cx: CGFloat(W) / 2, y: 730, size: 40, color: SUB)
        shelf(ctx, y: 300, count: 4, x0: 480, spacing: 300, labels: ["Сайт", "Бот", "OSINT", "Дизайн"])
    }),
    ("01", { ctx in
        base(ctx)
        // щит + сканирование кода
        rounded(ctx, CGRect(x: 320, y: 260, width: 620, height: 420), radius: 28, fill: sh(PANEL, 0.97), stroke: sh(WHITE, 0.14))
        for i in 0..<7 {
            rounded(ctx, CGRect(x: 370, y: 580 - CGFloat(i) * 52, width: 360, height: 30), radius: 8, fill: sh(i % 3 == 0 ? INDIGO : WHITE, i % 3 == 0 ? 0.5 : 0.16))
        }
        // луч
        ctx.saveGState()
        ctx.setFillColor(sh(LIME, 0.10))
        ctx.fill(CGRect(x: 700, y: 260, width: 150, height: 420))
        ctx.restoreGState()
        // щит
        let shield = CGMutablePath()
        shield.move(to: CGPoint(x: 1130, y: 700))
        shield.addLine(to: CGPoint(x: 1330, y: 640))
        shield.addLine(to: CGPoint(x: 1330, y: 460))
        shield.addLine(to: CGPoint(x: 1130, y: 330))
        shield.addLine(to: CGPoint(x: 930, y: 460))
        shield.addLine(to: CGPoint(x: 930, y: 640))
        shield.closeSubpath()
        ctx.addPath(shield); ctx.setFillColor(sh(LIME, 0.14)); ctx.fillPath()
        ctx.addPath(shield); ctx.setStrokeColor(LIME); ctx.setLineWidth(6); ctx.strokePath()
        ctx.setStrokeColor(LIME); ctx.setLineWidth(14)
        ctx.move(to: CGPoint(x: 1050, y: 530)); ctx.addLine(to: CGPoint(x: 1110, y: 470)); ctx.addLine(to: CGPoint(x: 1230, y: 590))
        ctx.strokePath()
        centered(ctx, "Авторство подтверждается автоматически", cx: CGFloat(W) / 2, y: 150, size: 44, color: WHITE, bold: true)
        centered(ctx, "Уникальный код в репозитории находит сервис", cx: CGFloat(W) / 2, y: 90, size: 28, color: DIM)
    }),
    ("02", { ctx in
        base(ctx)
        // ID-карта
        rounded(ctx, CGRect(x: 560, y: 300, width: 800, height: 440), radius: 32, fill: sh(PANEL, 0.97), stroke: sh(INDIGO, 0.6), lw: 3)
        glowCircle(ctx, cx: 720, cy: 600, r: 110, color: sh(INDIGO, 0.3))
        ctx.setFillColor(sh(INDIGO, 0.9)); ctx.fillEllipse(in: CGRect(x: 660, y: 540, width: 120, height: 120))
        text(ctx, "🧑‍💻", x: 672, y: 560, size: 76, color: WHITE)
        rounded(ctx, CGRect(x: 880, y: 560, width: 330, height: 34), radius: 10, fill: sh(WHITE, 0.16))
        rounded(ctx, CGRect(x: 880, y: 500, width: 240, height: 30), radius: 10, fill: sh(WHITE, 0.1))
        rounded(ctx, CGRect(x: 640, y: 380, width: 560, height: 44), radius: 14, fill: sh(WHITE, 0.05), stroke: sh(LIME, 0.5))
        text(ctx, "ID  1", x: 680, y: 392, size: 30, color: LIME, bold: true)
        text(ctx, "СОЗДАТЕЛЬ", x: 800, y: 396, size: 24, color: DIM)
        centered(ctx, "Постоянный цифровой ID у каждого", cx: CGFloat(W) / 2, y: 170, size: 44, color: WHITE, bold: true)
        centered(ctx, "ID 1 — у создателя сайта, видно сразу", cx: CGFloat(W) / 2, y: 110, size: 28, color: DIM)
    }),
    ("03", { ctx in
        base(ctx)
        for i in 0..<5 {
            star(ctx, cx: CGFloat(560 + i * 170), cy: 620, r: 64, filled: i < 5)
        }
        glowCircle(ctx, cx: CGFloat(W) / 2, cy: 620, r: 330, color: sh(AMBER, 0.12))
        centered(ctx, "Честные оценки со спорами", cx: CGFloat(W) / 2, y: 440, size: 46, color: WHITE, bold: true)
        centered(ctx, "Низкие — только с обоснованием. Несправедливые оспариваются", cx: CGFloat(W) / 2, y: 370, size: 28, color: DIM)
    }),
    ("04", { ctx in
        base(ctx)
        let pts: [(CGFloat, CGFloat)] = [(560, 640), (860, 520), (1160, 660), (1400, 480)]
        for i in 0..<pts.count {
            for j in (i + 1)..<pts.count {
                ctx.setStrokeColor(sh(INDIGO, 0.35)); ctx.setLineWidth(2)
                ctx.move(to: CGPoint(x: pts[i].0, y: pts[i].1)); ctx.addLine(to: CGPoint(x: pts[j].0, y: pts[j].1)); ctx.strokePath()
            }
        }
        for (i, p) in pts.enumerated() {
            glowCircle(ctx, cx: p.0, cy: p.1, r: 84, color: sh(i == 1 ? CYAN : INDIGO, 0.3))
            ctx.setFillColor(sh(i == 1 ? CYAN : INDIGO, 0.95)); ctx.fillEllipse(in: CGRect(x: p.0 - 46, y: p.1 - 46, width: 92, height: 92))
        }
        // луч поиска
        ctx.saveGState()
        ctx.setStrokeColor(sh(CYAN, 0.8)); ctx.setLineWidth(4)
        ctx.strokeEllipse(in: CGRect(x: 860 - 90, y: 520 - 90, width: 180, height: 180))
        ctx.restoreGState()
        centered(ctx, "Поиск людей по ID, роли и специфике", cx: CGFloat(W) / 2, y: 250, size: 44, color: WHITE, bold: true)
    }),
    ("05", { ctx in
        base(ctx)
        let hs: [CGFloat] = [520, 640, 460, 600, 500, 560]
        for i in 0..<6 {
            let x = CGFloat(200 + (i % 3) * 540)
            let y = CGFloat(i < 3 ? 470 : 220)
            let hh = hs[i]
            rounded(ctx, CGRect(x: x, y: y, width: 460, height: hh), radius: 24, fill: sh(PANEL, 0.96), stroke: sh(WHITE, 0.12))
            let colors: [CGColor] = [INDIGO, LIME, VIOLET, CYAN, AMBER, INDIGO]
            rounded(ctx, CGRect(x: x + 30, y: y + hh - 130, width: hh > 560 ? 400 : 300, height: 60), radius: 12, fill: sh(colors[i], 0.5))
            rounded(ctx, CGRect(x: x + 30, y: y + hh - 210, width: 380, height: 40), radius: 10, fill: sh(WHITE, 0.14))
            rounded(ctx, CGRect(x: x + 30, y: y + 40, width: 200, height: 34), radius: 10, fill: sh(WHITE, 0.08))
        }
        centered(ctx, "Витрина-галерея: все работы сообщества", cx: CGFloat(W) / 2, y: 1000, size: 42, color: WHITE, bold: true)
    }),
    ("06", { ctx in
        base(ctx)
        let tabs = ["Модерация", "Пользователи", "Споры", "Тикеты", "Оплаты", "Промокоды", "Юзернеймы"]
        for i in 0..<7 {
            let colI = i % 2, rowI = i / 2
            let x = CGFloat(420 + colI * 560)
            let y = CGFloat(780 - rowI * 170)
            let active = i == 1
            rounded(ctx, CGRect(x: x, y: y, width: 500, height: 130), radius: 20,
                    fill: sh(active ? INDIGO : PANEL, active ? 0.85 : 0.96),
                    stroke: sh(active ? INDIGO : WHITE, active ? 1 : 0.12))
            text(ctx, tabs[i], x: x + 36, y: y + 52, size: 32, color: active ? WHITE : SUB, bold: active)
        }
        centered(ctx, "Админка на 7 вкладок", cx: CGFloat(W) / 2, y: 120, size: 44, color: WHITE, bold: true)
        centered(ctx, "Управление сайтом без доступа к серверу", cx: CGFloat(W) / 2, y: 60, size: 28, color: DIM)
    }),
    ("07", { ctx in
        base(ctx)
        // корона
        glowCircle(ctx, cx: CGFloat(W) / 2, cy: 560, r: 260, color: sh(AMBER, 0.16))
        let cr = CGMutablePath()
        cr.move(to: CGPoint(x: 760, y: 640))
        cr.addLine(to: CGPoint(x: 820, y: 500))
        cr.addLine(to: CGPoint(x: 920, y: 590))
        cr.addLine(to: CGPoint(x: 960, y: 440))
        cr.addLine(to: CGPoint(x: 1000, y: 590))
        cr.addLine(to: CGPoint(x: 1100, y: 500))
        cr.addLine(to: CGPoint(x: 1160, y: 640))
        cr.closeSubpath()
        ctx.addPath(cr); ctx.setFillColor(sh(AMBER, 0.9)); ctx.fillPath()
        rounded(ctx, CGRect(x: 760, y: 560, width: 400, height: 46), radius: 12, fill: sh(AMBER, 0.75))
        rounded(ctx, CGRect(x: 660, y: 300, width: 600, height: 60), radius: 18, fill: sh(PANEL, 0.97), stroke: sh(AMBER, 0.5))
        centered(ctx, "PRO", cx: CGFloat(W) / 2, y: 320, size: 34, color: AMBER, bold: true)
        centered(ctx, "Безлимит работ и значок Pro — 499 ₽/мес", cx: CGFloat(W) / 2, y: 170, size: 44, color: WHITE, bold: true)
    }),
    ("08", { ctx in
        base(ctx)
        let layers: [(CGFloat, String, CGColor)] = [(300, "База данных", VIOLET), (480, "Приложение", INDIGO), (660, "Облако", LIME)]
        for (y, label, c) in layers {
            ctx.saveGState()
            ctx.translateBy(x: CGFloat(W) / 2, y: y)
            ctx.concatenate(CGAffineTransform(scaleX: 1, y: 0.42))
            ctx.setFillColor(sh(c, 0.22)); ctx.setStrokeColor(sh(c, 0.8)); ctx.setLineWidth(3)
            ctx.fillEllipse(in: CGRect(x: -430, y: -130, width: 860, height: 260))
            ctx.strokeEllipse(in: CGRect(x: -430, y: -130, width: 860, height: 260))
            ctx.restoreGState()
            text(ctx, label, x: CGFloat(W) / 2 - textW(label, size: 26) / 2, y: y + 24, size: 26, color: SUB)
        }
        centered(ctx, "Next.js · React · PostgreSQL с автопереключением", cx: CGFloat(W) / 2, y: 140, size: 40, color: WHITE, bold: true)
        centered(ctx, "Расходы на инфраструктуру — 0 ₽/мес", cx: CGFloat(W) / 2, y: 80, size: 28, color: LIME)
    }),
    ("09", { ctx in
        base(ctx)
        shelf(ctx, y: 420, count: 3, x0: 660, spacing: 320, labels: ["Ваша", "работа", "здесь"])
        // свободное место со свечением
        glowCircle(ctx, cx: 660 + 320 * 3 - 130, cy: 500, r: 120, color: sh(LIME, 0.2))
        rounded(ctx, CGRect(x: 660 + 320 * 3 - 240, y: 440, width: 220, height: 150), radius: 18, fill: sh(WHITE, 0.03), stroke: sh(LIME, 0.6), lw: 3)
        centered(ctx, "Место занято?", cx: CGFloat(W) / 2, y: 950, size: 40, color: WHITE, bold: true)
        centered(ctx, "merugan.is-a.dev — сайт уже работает", cx: CGFloat(W) / 2, y: 870, size: 30, color: LIME)
    }),
]

let outDir = "/tmp/videogen/slides"
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
for (name, draw) in slides {
    guard let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                              space: CGColorSpace(name: CGColorSpace.sRGB)!,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { die("ctx") }
    draw(ctx)
    guard let img = ctx.makeImage() else { die("makeImage \(name)") }
    let url = URL(fileURLWithPath: "\(outDir)/slide\(name).png") as CFURL
    guard let dest = CGImageDestinationCreateWithURL(url, "public.png" as CFString, 1, nil) else { die("dest \(name)") }
    CGImageDestinationAddImage(dest, img, nil)
    guard CGImageDestinationFinalize(dest) else { die("finalize \(name)") }
    print("slide\(name) ok")
}
print("ALL SLIDES DONE")
