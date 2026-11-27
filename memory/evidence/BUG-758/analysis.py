# BUG-758 — number verification
cases = [
    ("Total: 440h 59m", 440*60+59, "18d"),
    ("Total: 393h 37m", 393*60+37, "16d"),
    ("Total: 2222h 26m", 2222*60+26, "92d"),
    ("Total: 2050h 29m", 2050*60+29, "85d"),
]
for label, total_mins, order_dot in cases:
    h = total_mins // 60; d = h // 24; rh = h % 24
    display = f"{d}d {rh}h" if rh > 0 else f"{d}d"
    print(f"{label} → {display} (order dot: {order_dot})")
