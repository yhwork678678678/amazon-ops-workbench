export type Note = {
  id: string
  title: string
  body: string
  tag: string
  createdAt: string
  dueAt?: string
}

export type UploadedFile = {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string | null
  path: string
  htmlUrl?: string
  commitUrl?: string
  sha?: string
}

export type PreviewFile = {
  name: string
  type: string
  url: string
  text?: string
}

// 输入层用字符串保存，避免受控 number 输入打不出中间态（如 "29."）
export type CalculatorState = {
  salePrice: string
  cost: string
  shipping: string
  fbaFee: string
  adSpend: string
  referralRate: string
}

export type Workflow = {
  id: string
  time: string
  title: string
  body: string
  reminderEnabled: boolean
  reminderMinutes: number
}
