import { Calculator } from 'lucide-react'
import { useMemo } from 'react'
import type { CalculatorState } from '../types'

type CalculatorPanelProps = {
  calculator: CalculatorState
  onChange: (key: keyof CalculatorState, value: string) => void
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function CalculatorPanel({ calculator, onChange }: CalculatorPanelProps) {
  const financials = useMemo(() => {
    const salePrice = toNumber(calculator.salePrice)
    const referralFee = salePrice * (toNumber(calculator.referralRate) / 100)
    const totalCost =
      toNumber(calculator.cost) +
      toNumber(calculator.shipping) +
      toNumber(calculator.fbaFee) +
      toNumber(calculator.adSpend) +
      referralFee
    const profit = salePrice - totalCost
    const margin = salePrice ? (profit / salePrice) * 100 : 0
    const landedCost = toNumber(calculator.cost) + toNumber(calculator.shipping)
    const roi = landedCost ? (profit / landedCost) * 100 : 0

    return { referralFee, totalCost, profit, margin, roi }
  }, [calculator])

  return (
    <section className="split-grid">
      <article className="panel" id="calculator">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Margin desk</p>
            <h3>单品利润测算</h3>
          </div>
          <Calculator size={20} />
        </div>

        <div className="calculator-grid">
          {(
            Object.entries({
              salePrice: '售价',
              cost: '采购成本',
              shipping: '头程/物流',
              fbaFee: 'FBA 费用',
              adSpend: '单件广告',
              referralRate: '佣金比例 %',
            }) as [keyof CalculatorState, string][]
          ).map(([key, label]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                type="number"
                step="0.01"
                value={calculator[key]}
                onChange={(event) => onChange(key, event.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="result-strip">
          <div>
            <span>预估利润</span>
            <strong className={financials.profit >= 0 ? 'positive' : 'negative'}>
              ${financials.profit.toFixed(2)}
            </strong>
          </div>
          <div>
            <span>利润率</span>
            <strong>{financials.margin.toFixed(1)}%</strong>
          </div>
          <div>
            <span>ROI</span>
            <strong>{financials.roi.toFixed(1)}%</strong>
          </div>
        </div>
      </article>
    </section>
  )
}
