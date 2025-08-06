'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle } from 'lucide-react'

interface QuizStepProps {
  step: {
    question: string
    subtitle?: string
    type: 'single' | 'multiple' | 'boolean'
    field: string
    options: string[]
  }
  value: any
  onChange: (field: string, value: any) => void
}

export default function QuizStep({ step, value, onChange }: QuizStepProps) {
  const handleSingleChoice = (option: string) => {
    onChange(step.field, option)
  }

  const handleBooleanChoice = (option: string) => {
    onChange(step.field, option === 'Ja')
  }

  const handleMultipleChoice = (option: string) => {
    const currentValues = Array.isArray(value) ? value : []
    const newValues = currentValues.includes(option)
      ? currentValues.filter(v => v !== option)
      : [...currentValues, option]
    onChange(step.field, newValues)
  }

  const isSelected = (option: string) => {
    if (step.type === 'single') {
      return value === option
    } else if (step.type === 'boolean') {
      return (value === true && option === 'Ja') || (value === false && option === 'Nein')
    } else if (step.type === 'multiple') {
      return Array.isArray(value) && value.includes(option)
    }
    return false
  }

  const handleOptionClick = (option: string) => {
    if (step.type === 'single') {
      handleSingleChoice(option)
    } else if (step.type === 'boolean') {
      handleBooleanChoice(option)
    } else if (step.type === 'multiple') {
      handleMultipleChoice(option)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl md:text-2xl">
          {step.question}
        </CardTitle>
        {step.subtitle && (
          <p className="text-sm text-gray-600 mt-2">
            {step.subtitle}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {step.options.map((option, index) => (
            <Button
              key={index}
              variant={isSelected(option) ? "default" : "outline"}
              className={`w-full text-left justify-start p-4 h-auto ${
                isSelected(option) 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleOptionClick(option)}
            >
              <div className="flex items-center space-x-3 w-full">
                {step.type === 'multiple' ? (
                  isSelected(option) ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 flex-shrink-0" />
                  )
                ) : (
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    isSelected(option) 
                      ? 'border-white bg-white' 
                      : 'border-gray-400'
                  }`}>
                    {isSelected(option) && step.type === 'single' && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 m-0.5"></div>
                    )}
                  </div>
                )}
                <span className="text-base">{option}</span>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}