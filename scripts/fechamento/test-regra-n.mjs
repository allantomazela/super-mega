import assert from 'node:assert/strict'
import {
  aplicarFechamento,
  listarNDisponiveis,
  matrizDisponivel,
  snapFechamentoN,
  FECHAMENTO_N_MAX,
} from '../../src/lib/coveringDesign.ts'

console.log('UI max teórico (Caixa) =', FECHAMENTO_N_MAX)
console.log('n Quina =', listarNDisponiveis('quina'))
console.log('n Quadra =', listarNDisponiveis('quadra'))

assert.deepEqual(listarNDisponiveis('quina'), [10, 11, 12])
assert.deepEqual(listarNDisponiveis('quadra'), [10])

assert.equal(matrizDisponivel(12, 'quina'), true)
assert.equal(matrizDisponivel(13, 'quina'), false)
assert.equal(matrizDisponivel(20, 'quina'), false)
assert.equal(matrizDisponivel(10, 'quadra'), true)
assert.equal(matrizDisponivel(11, 'quadra'), false)

assert.equal(snapFechamentoN(20, 'quina'), 12)
assert.equal(snapFechamentoN(15, 'quina'), 12)
assert.equal(snapFechamentoN(11, 'quadra'), 10)
assert.equal(snapFechamentoN(9, 'quina'), 10)

const l12 = aplicarFechamento([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 12, 'quina')
assert.equal(l12.length, 44)
assert.equal(l12[0].length, 6)

let threw = false
try {
  aplicarFechamento([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], 15, 'quina')
} catch {
  threw = true
}
assert.equal(threw, true)

console.log('PASS — regra correta: só gera com matriz; n>12 não é bug, é ausência de tabela.')
