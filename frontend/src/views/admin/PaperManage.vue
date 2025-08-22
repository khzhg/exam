<template>
  <div class="paper-manage">
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <h2>试卷管理</h2>
          <div class="header-actions">
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              创建试卷
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <div class="filter-section">
        <el-form :model="filterForm" inline>
          <el-form-item label="试卷名称">
            <el-input v-model="filterForm.title" placeholder="输入试卷名称" clearable />
          </el-form-item>
          <el-form-item label="科目">
            <el-input v-model="filterForm.subject" placeholder="输入科目" clearable />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px">
              <el-option label="未发布" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="已结束" value="ended" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadPapers">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 试卷列表 -->
    <el-card>
      <el-table :data="papers" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="试卷名称" min-width="200" />
        <el-table-column prop="subject" label="科目" width="120">
          <template #default="scope">
            <span>{{ scope.row.subject || '未设置' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total_score" label="总分" width="100" />
        <el-table-column prop="duration" label="时长(分钟)" width="120" />
        <el-table-column prop="question_count" label="题目数量" width="100" />
        <el-table-column prop="paper_type" label="试卷类型" width="120">
          <template #default="scope">
            <el-tag 
              :type="scope.row.paper_type === 'both' ? 'primary' : scope.row.paper_type === 'practice' ? 'success' : 'warning'"
            >
              {{ scope.row.paper_type === 'both' ? '练习+考试' : scope.row.paper_type === 'practice' ? '仅练习' : '仅考试' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusColor(getStatusFromActive(scope.row.is_active))">
              {{ getStatusName(getStatusFromActive(scope.row.is_active)) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewPaper(scope.row)">预览</el-button>
            <el-button size="small" type="primary" @click="editPaper(scope.row)">编辑</el-button>
            <el-dropdown @command="handleCommand($event, scope.row)">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="publish" v-if="!scope.row.is_active">
                    发布试卷
                  </el-dropdown-item>
                  <el-dropdown-item command="end" v-if="scope.row.is_active">
                    结束考试
                  </el-dropdown-item>
                  <el-dropdown-item command="copy">复制试卷</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除试卷</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadPapers"
          @current-change="loadPapers"
        />
      </div>
    </el-card>

    <!-- 创建/编辑试卷对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editMode ? '编辑试卷' : '创建试卷'"
      width="1000px"
      @closed="resetForm"
    >
      <el-steps :active="currentStep" align-center style="margin-bottom: 30px">
        <el-step title="基本信息" />
        <el-step title="选择题目" />
        <el-step title="完成设置" />
      </el-steps>

      <!-- 步骤1：基本信息 -->
      <div v-show="currentStep === 0">
        <el-form :model="paperForm" :rules="paperRules" ref="paperFormRef" label-width="120px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="试卷名称" prop="title">
                <el-input v-model="paperForm.title" placeholder="请输入试卷名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="科目" prop="subject">
                <el-input v-model="paperForm.subject" placeholder="如：数学、语文" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="试卷描述">
            <el-input 
              v-model="paperForm.description" 
              type="textarea" 
              :rows="3"
              placeholder="请输入试卷描述"
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="试卷类型" prop="paper_type">
                <el-select v-model="paperForm.paper_type" placeholder="选择试卷类型" style="width: 100%">
                  <el-option label="练习+考试" value="both" />
                  <el-option label="仅练习" value="practice" />
                  <el-option label="仅考试" value="exam" />
                </el-select>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">
                  练习+考试：学生可练习也可参加考试；仅练习：只能用于练习；仅考试：只能用于正式考试
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="练习可见性" v-if="paperForm.paper_type === 'practice' || paperForm.paper_type === 'both'">
                <el-switch 
                  v-model="paperForm.practice_visible" 
                  :active-value="1" 
                  :inactive-value="0"
                  active-text="学生可见" 
                  inactive-text="学生不可见"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20" v-if="paperForm.paper_type === 'exam' || paperForm.paper_type === 'both'">
            <el-col :span="24">
              <el-form-item label="考试开放时间">
                <el-date-picker
                  v-model="paperForm.exam_visible_time"
                  type="datetime"
                  placeholder="选择考试开放时间"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 300px"
                />
                <div style="font-size: 12px; color: #999; margin-top: 4px;">
                  留空表示立即开放；设置时间后学生在指定时间才能看到此试卷
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="考试时长" prop="duration">
                <div style="display: flex; align-items: center; width: 100%;">
                  <el-input-number 
                    v-model="paperForm.duration" 
                    :min="1" 
                    :max="300"
                    controls-position="right"
                    style="flex: 1;"
                  />
                  <span style="margin-left: 8px; color: #999; white-space: nowrap;">分钟</span>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="总分" prop="total_score">
                <div style="display: flex; align-items: center; width: 100%;">
                  <el-input-number 
                    v-model="paperForm.total_score" 
                    :min="1" 
                    :max="1000"
                    controls-position="right"
                    style="flex: 1;"
                    @change="onTotalScoreChange"
                  />
                  <span style="margin-left: 8px; color: #999; white-space: nowrap;">分</span>
                </div>
                <div style="font-size: 11px; color: #999; margin-top: 2px;">
                  最终总分将根据题目分值自动计算
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="及格分数">
                <div style="display: flex; align-items: center; width: 100%;">
                  <el-input-number 
                    v-model="paperForm.pass_score" 
                    :min="0" 
                    :max="paperForm.total_score"
                    controls-position="right"
                    style="flex: 1;"
                  />
                  <span style="margin-left: 8px; color: #999; white-space: nowrap;">分</span>
                </div>
                <div style="font-size: 11px; color: #999; margin-top: 2px;">
                  可在最后一步调整，默认为总分的60%
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <!-- 步骤2：选择题目 -->
      <div v-show="currentStep === 1">
        <div class="question-selection">
          <div class="selection-methods">
            <el-radio-group v-model="selectionMethod" @change="onSelectionMethodChange">
              <el-radio label="manual">手动选择</el-radio>
              <el-radio label="auto">自动组卷</el-radio>
            </el-radio-group>
          </div>

          <!-- 手动选择 -->
          <div v-if="selectionMethod === 'manual'">
            <div class="question-filter">
              <el-form inline>
                <el-form-item label="题目类型" >
                  <el-select v-model="questionFilter.type" @change="onQuestionFilterChange" style="width: 120px;">
                    <el-option label="全部" value="" />
                    <el-option label="单选题" value="single" />
                    <el-option label="多选题" value="multiple" />
                    <el-option label="判断题" value="truefalse" />
                    <el-option label="简答题" value="essay" />
                    <el-option label="填空题" value="fill" />
                  </el-select>
                </el-form-item>
                <el-form-item label="科目">
                  <el-input v-model="questionFilter.subject" @input="onQuestionFilterChange" style="width: 150px;" />
                </el-form-item>
                <el-form-item>
                  <el-button size="small" @click="resetQuestionFilter">重置筛选</el-button>
                </el-form-item>
              </el-form>
            </div>

            <div class="question-lists">
              <div class="available-questions">

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <h4>可选题目 ({{ questionPagination.total }} 总数，当前页 {{ availableQuestions.length }})</h4>

                </div>
                <el-table 
                  ref="availableQuestionsTable"
                  :data="availableQuestions" 
                  height="300"
                  @selection-change="handleSelectionChange"
                >
                  <el-table-column type="selection" width="55" />
                  <el-table-column prop="title" label="题目标题" min-width="200" />
                  <el-table-column prop="type" label="类型" width="80">
                    <template #default="scope">
                      <el-tag size="small">{{ getTypeName(scope.row.type) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="difficulty" label="难度" width="80">
                    <template #default="scope">
                      <el-rate v-model="scope.row.difficulty" disabled size="small" />
                    </template>
                  </el-table-column>
                </el-table>
                
                <!-- 分页控件 -->
                <div style="margin-top: 10px; text-align: center;">
                  <el-pagination
                    v-model:current-page="questionPagination.page"
                    :page-size="questionPagination.limit"
                    :total="questionPagination.total"
                    :page-sizes="[50, 100, 200]"
                    layout="total, sizes, prev, pager, next"
                    @size-change="onQuestionPageSizeChange"
                    @current-change="onQuestionPageChange"
                    small
                  />
                </div>
              </div>

              <div class="selected-questions">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <h4>已选题目 ({{ selectedQuestions.length }})</h4>
                  <div>
                    <el-button size="small" @click="showBatchScoreDialog = true">批量设分</el-button>
                    <el-button size="small" type="danger" @click="clearSelectedQuestions">清空</el-button>
                  </div>
                </div>
                <el-table :data="selectedQuestions" height="300">
                  <el-table-column prop="title" label="题目标题" min-width="200" />
                  <el-table-column prop="type" label="类型" width="80">
                    <template #default="scope">
                      <el-tag size="small">{{ getTypeName(scope.row.type) }}</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="分值" width="100">
                    <template #default="scope">
                      <el-input-number 
                        v-model="scope.row.score" 
                        :min="0.5" 
                        :max="100" 
                        :step="0.5"
                        size="small"
                        controls-position="right"
                        @change="updateTotalScore"
                      />
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" width="80">
                    <template #default="scope">
                      <el-button 
                        size="small" 
                        type="danger" 
                        @click="removeQuestion(scope.$index)"
                      >移除</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>

          <!-- 自动组卷 -->
          <div v-else>
            <el-form :model="autoConfig" label-width="120px">
              <div style="margin-bottom: 20px;">
                <h4>题目数量设置</h4>
                <el-row :gutter="20">
                  <el-col :span="6">
                    <el-form-item label="单选题">
                      <el-input-number v-model="autoConfig.single" :min="0" :max="50" />
                      <div style="font-size: 12px; color: #999;">题库中有 {{ getQuestionCount('single') }} 题</div>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="多选题">
                      <el-input-number v-model="autoConfig.multiple" :min="0" :max="50" />
                      <div style="font-size: 12px; color: #999;">题库中有 {{ getQuestionCount('multiple') }} 题</div>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="判断题">
                      <el-input-number v-model="autoConfig.truefalse" :min="0" :max="50" />
                      <div style="font-size: 12px; color: #999;">题库中有 {{ getQuestionCount('truefalse') }} 题</div>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="填空题">
                      <el-input-number v-model="autoConfig.fill" :min="0" :max="20" />
                      <div style="font-size: 12px; color: #999;">题库中有 {{ getQuestionCount('fill') }} 题</div>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :span="6">
                    <el-form-item label="简答题">
                      <el-input-number v-model="autoConfig.essay" :min="0" :max="20" />
                      <div style="font-size: 12px; color: #999;">题库中有 {{ getQuestionCount('essay') }} 题</div>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <h4>分值设置</h4>
                  <div>
                    <el-button size="small" type="primary" @click="adjustScoresByTarget" v-if="targetTotalScore > 0">
                      按目标总分调整 ({{ targetTotalScore }}分)
                    </el-button>
                    <el-button size="small" @click="resetToDefaultScores">恢复默认</el-button>
                  </div>
                </div>
                <el-row :gutter="20">
                  <el-col :span="6">
                    <el-form-item label="单选题分值">
                      <el-input-number v-model="autoScoreConfig.single" :min="0.5" :max="50" :step="0.5" />
                      <div style="font-size: 12px; color: #999;">每题分值</div>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="多选题分值">
                      <el-input-number v-model="autoScoreConfig.multiple" :min="0.5" :max="50" :step="0.5" />
                      <div style="font-size: 12px; color: #999;">每题分值</div>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="判断题分值">
                      <el-input-number v-model="autoScoreConfig.truefalse" :min="0.5" :max="50" :step="0.5" />
                      <div style="font-size: 12px; color: #999;">每题分值</div>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="填空题分值">
                      <el-input-number v-model="autoScoreConfig.fill" :min="0.5" :max="50" :step="0.5" />
                      <div style="font-size: 12px; color: #999;">每题分值</div>
                    </el-form-item>
                  </el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :span="6">
                    <el-form-item label="简答题分值">
                      <el-input-number v-model="autoScoreConfig.essay" :min="0.5" :max="50" :step="0.5" />
                      <div style="font-size: 12px; color: #999;">每题分值</div>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <div style="margin-bottom: 20px; padding: 15px; background-color: #f5f7fa; border-radius: 4px;">
                <div style="color: #303133; font-weight: 500; margin-bottom: 10px;">
                  预计总分：{{ calculateTotalScore() }} 分
                  <span v-if="targetTotalScore > 0 && calculateTotalScore() !== targetTotalScore" 
                        style="color: #E6A23C; font-size: 12px; margin-left: 10px;">
                    (目标: {{ targetTotalScore }}分)
                  </span>
                  <span v-else-if="targetTotalScore > 0 && calculateTotalScore() === targetTotalScore"
                        style="color: #67C23A; font-size: 12px; margin-left: 10px;">
                    ✓ 已达目标
                  </span>
                </div>
                <div style="font-size: 12px; color: #606266;">
                  <div>单选题：{{ autoConfig.single }} × {{ autoScoreConfig.single }} = {{ autoConfig.single * autoScoreConfig.single }} 分</div>
                  <div>多选题：{{ autoConfig.multiple }} × {{ autoScoreConfig.multiple }} = {{ autoConfig.multiple * autoScoreConfig.multiple }} 分</div>
                  <div>判断题：{{ autoConfig.truefalse }} × {{ autoScoreConfig.truefalse }} = {{ autoConfig.truefalse * autoScoreConfig.truefalse }} 分</div>
                  <div>填空题：{{ autoConfig.fill }} × {{ autoScoreConfig.fill }} = {{ autoConfig.fill * autoScoreConfig.fill }} 分</div>
                  <div>简答题：{{ autoConfig.essay }} × {{ autoScoreConfig.essay }} = {{ autoConfig.essay * autoScoreConfig.essay }} 分</div>
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #E6A23C;">
                  预计及格分：{{ Math.ceil(calculateTotalScore() * 0.6) }} 分 (60%，向上取整)
                </div>
              </div>

              <el-button 
                type="primary" 
                @click="autoSelectQuestions"
                :loading="autoSelecting"
                :disabled="calculateTotalScore() === 0"
              >
                {{ autoSelecting ? '正在选题...' : '自动选择题目' }}
              </el-button>
              <div v-if="calculateTotalScore() === 0" style="color: #E6A23C; font-size: 12px; margin-top: 5px;">
                请至少设置一种题型的数量
              </div>
            </el-form>
          </div>
        </div>
      </div>

      <!-- 步骤3：完成设置 -->
      <div v-show="currentStep === 2">
        <div class="paper-summary">
          <h3>试卷预览</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="试卷名称">{{ paperForm.title }}</el-descriptions-item>
            <el-descriptions-item label="科目">{{ paperForm.subject }}</el-descriptions-item>
            <el-descriptions-item label="试卷类型">
              {{ paperForm.paper_type === 'both' ? '练习+考试' : paperForm.paper_type === 'practice' ? '仅练习' : '仅考试' }}
            </el-descriptions-item>
            <el-descriptions-item label="考试时长">{{ paperForm.duration }} 分钟</el-descriptions-item>
            <el-descriptions-item label="总分">
              <span style="color: #409EFF; font-weight: 500;">{{ paperForm.total_score }} 分</span>
              <span style="font-size: 12px; color: #999; margin-left: 10px;">
                (根据题目分值自动计算)
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="及格分数">
              <el-input-number 
                v-model="paperForm.pass_score" 
                :min="0" 
                :max="paperForm.total_score"
                :step="1"
                controls-position="right"
                size="small"
                style="width: 120px;"
              />
              <span style="font-size: 12px; color: #999; margin-left: 10px;">
                建议: {{ Math.ceil(paperForm.total_score * 0.6) }} 分 (60%)
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="题目数量">{{ selectedQuestions.length }} 题</el-descriptions-item>
            <el-descriptions-item 
              label="考试开放时间" 
              v-if="paperForm.paper_type === 'exam' || paperForm.paper_type === 'both'"
            >
              {{ paperForm.exam_visible_time || '立即开放' }}
            </el-descriptions-item>
            <el-descriptions-item 
              label="练习可见性" 
              v-if="paperForm.paper_type === 'practice' || paperForm.paper_type === 'both'"
            >
              {{ paperForm.practice_visible ? '学生可见' : '学生不可见' }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="question-summary" style="margin-top: 20px">
            <h4>题目分布</h4>
            <el-table :data="questionSummary" size="small">
              <el-table-column prop="type" label="题目类型" />
              <el-table-column prop="count" label="数量" />
              <el-table-column prop="score" label="总分值" />
            </el-table>
          </div>

          <!-- 分值统计卡片 -->
          <div style="margin-top: 20px; padding: 15px; background-color: #f5f7fa; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 500; color: #303133;">分值统计</span>
              <el-tag :type="isScoreMatched ? 'success' : 'warning'">
                {{ isScoreMatched ? '分值匹配' : '分值不匹配' }}
              </el-tag>
            </div>
            <div style="font-size: 14px; color: #606266;">
              <div>实际总分：{{ paperForm.total_score }} 分</div>
              <div>及格分数：{{ paperForm.pass_score }} 分 ({{ ((paperForm.pass_score / paperForm.total_score) * 100).toFixed(1) }}%)</div>
              <div v-if="!isScoreMatched" style="color: #E6A23C; margin-top: 5px;">
                ⚠️ 提示：第一步设置的总分与实际题目总分不一致，已自动更新为实际总分
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button v-if="currentStep > 0" @click="currentStep--">上一步</el-button>
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button 
            v-if="currentStep < 2" 
            type="primary" 
            @click="nextStep"
          >下一步</el-button>
          <el-button 
            v-if="currentStep === 2" 
            type="primary" 
            @click="savePaper" 
            :loading="saving"
          >{{ editMode ? '更新试卷' : '创建试卷' }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 试卷预览对话框 -->
    <el-dialog v-model="showPreviewDialog" title="试卷预览" width="800px">
      <div class="paper-preview">
        <!-- TODO: 实现试卷预览 -->
        <p>试卷预览功能待实现</p>
      </div>
    </el-dialog>

    <!-- 批量设分对话框 -->
    <el-dialog v-model="showBatchScoreDialog" title="批量设置分值" width="500px">
      <el-form :model="batchScoreForm" label-width="120px">
        <el-form-item label="设置方式">
          <el-radio-group v-model="batchScoreForm.method">
            <el-radio label="byType">按题型设置</el-radio>
            <el-radio label="uniform">统一分值</el-radio>
          </el-radio-group>
        </el-form-item>

        <div v-if="batchScoreForm.method === 'byType'">
          <el-form-item 
            v-for="type in getSelectedQuestionTypes()" 
            :key="type"
            :label="getTypeName(type)"
          >
            <el-input-number 
              v-model="batchScoreForm.typeScores[type]" 
              :min="0.5" 
              :max="100" 
              :step="0.5"
            />
            <span style="margin-left: 10px; color: #999;">
              ({{ getSelectedQuestionCountByType(type) }} 题)
            </span>
          </el-form-item>
        </div>

        <el-form-item v-else label="统一分值">
          <el-input-number 
            v-model="batchScoreForm.uniformScore" 
            :min="0.5" 
            :max="100" 
            :step="0.5"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showBatchScoreDialog = false">取消</el-button>
        <el-button type="primary" @click="applyBatchScore">应用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown } from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const autoSelecting = ref(false)
const showCreateDialog = ref(false)
const showPreviewDialog = ref(false)
const showBatchScoreDialog = ref(false)
const editMode = ref(false)
const currentStep = ref(0)
const selectionMethod = ref('manual')

const papers = ref([])
const availableQuestions = ref([])
const selectedQuestions = ref([])
const availableQuestionsTable = ref()
const allQuestions = ref([]) // 存储所有题目，用于统计数量
const questionStatistics = ref({}) // 存储题目类型统计
const isUpdatingSelection = ref(false) // 标志位，区分主动选择和被动更新

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const questionPagination = reactive({
  page: 1,
  limit: 100,
  total: 0
})

const filterForm = reactive({
  title: '',
  subject: '',
  status: ''
})

const paperForm = reactive({
  id: null,
  title: '',
  subject: '',
  description: '',
  duration: 60,
  total_score: 100,
  pass_score: 60,
  paper_type: 'both',
  exam_visible_time: null,
  practice_visible: 1
})

const targetTotalScore = ref(100) // 存储第一步设置的目标总分

const questionFilter = reactive({
  type: '',
  subject: ''
})

const autoConfig = reactive({
  single: 10,
  multiple: 5,
  truefalse: 5,
  essay: 2,
  fill: 3
})

const autoScoreConfig = reactive({
  single: 2,
  multiple: 3,
  truefalse: 1,
  essay: 10,
  fill: 5
})

const batchScoreForm = reactive({
  method: 'byType',
  uniformScore: 2,
  typeScores: {
    single: 2,
    multiple: 3,
    truefalse: 1,
    essay: 10,
    fill: 5
  }
})

const paperRules = {
  title: [{ required: true, message: '请输入试卷名称', trigger: 'blur' }],
  subject: [{ required: true, message: '请输入科目', trigger: 'blur' }],
  duration: [{ required: true, message: '请设置考试时长', trigger: 'change' }],
  total_score: [{ required: true, message: '请设置总分', trigger: 'change' }]
}

const paperFormRef = ref()

// 计算属性
const questionSummary = computed(() => {
  const summary = {}
  selectedQuestions.value.forEach(q => {
    if (!summary[q.type]) {
      summary[q.type] = { count: 0, score: 0 }
    }
    summary[q.type].count++
    summary[q.type].score += q.score || 0
  })
  
  return Object.entries(summary).map(([type, data]) => ({
    type: getTypeName(type),
    count: data.count,
    score: data.score
  }))
})

const isScoreMatched = computed(() => {
  // 在第三步时，检查分值是否合理
  if (currentStep.value === 2) {
    return paperForm.total_score > 0 && paperForm.pass_score <= paperForm.total_score
  }
  return true
})

// 方法
const loadPapers = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    let url = `/api/papers?page=${pagination.page}&limit=${pagination.limit}`
    
    // 添加筛选参数
    if (filterForm.title) url += `&title=${encodeURIComponent(filterForm.title)}`
    if (filterForm.subject) url += `&subject=${encodeURIComponent(filterForm.subject)}`
    if (filterForm.status) url += `&status=${filterForm.status}`
    
    // 添加时间戳避免缓存
    url += `&_t=${Date.now()}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await response.json()
    
    if (result.success) {
      papers.value = result.data.papers || result.data.list || []
      pagination.total = result.data.total || 0
      
      console.log('试卷列表刷新成功，数量:', papers.value.length)
    } else {
      ElMessage.error(result.message || '加载试卷列表失败')
    }
  } catch (error) {
    console.error('加载试卷列表失败:', error)
    ElMessage.error('加载试卷列表失败')
  } finally {
    loading.value = false
  }
}

const loadAvailableQuestions = async () => {
  try {
    const token = localStorage.getItem('token')
    
    // 构建查询参数
    let params = new URLSearchParams({
      page: questionPagination.page,
      limit: questionPagination.limit,
    })
    
    // 添加筛选条件
    if (questionFilter.type) {
      params.append('type', questionFilter.type)
    }
    if (questionFilter.subject) {
      params.append('subject', questionFilter.subject)
    }
    
    const response = await fetch(`/api/questions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await response.json()
    if (result.success) {
      availableQuestions.value = result.data.questions || []
      questionPagination.total = result.data.total || 0
      
      // 保持已选题目的选中状态
      if (selectedQuestions.value.length > 0) {
        isUpdatingSelection.value = true
        setTimeout(() => {
          selectedQuestions.value.forEach(selectedQ => {
            const index = availableQuestions.value.findIndex(q => q.id === selectedQ.id)
            if (index > -1) {
              availableQuestionsTable.value?.toggleRowSelection(availableQuestions.value[index], true)
            }
          })
          setTimeout(() => {
            isUpdatingSelection.value = false
          }, 50)
        }, 100)
      }
    } else {
      ElMessage.error(result.message || '获取题目失败')
    }
  } catch (error) {
    console.error('加载题目失败:', error)
    ElMessage.error('加载题目失败')
  }
}

const onQuestionPageChange = () => {
  loadAvailableQuestions()
}

const onQuestionPageSizeChange = () => {
  questionPagination.page = 1
  loadAvailableQuestions()
}

const onQuestionFilterChange = () => {
  questionPagination.page = 1
  loadAvailableQuestions()
}

const resetQuestionFilter = () => {
  questionFilter.type = ''
  questionFilter.subject = ''
  questionPagination.page = 1
  loadAvailableQuestions()
}

const resetFilter = () => {
  Object.assign(filterForm, {
    title: '',
    subject: '',
    status: ''
  })
  loadPapers()
}

const getStatusFromActive = (isActive) => {
  return isActive ? 'published' : 'draft'
}

const getStatusName = (status) => {
  const statusMap = {
    draft: '未发布',
    published: '已发布',
    ended: '已结束'
  }
  return statusMap[status] || status
}

const getStatusColor = (status) => {
  const colorMap = {
    draft: 'info',
    published: 'success',
    ended: 'warning'
  }
  return colorMap[status] || ''
}

const getTypeName = (type) => {
  const typeMap = {
    single: '单选题',
    multiple: '多选题',
    truefalse: '判断题',
    essay: '简答题',
    fill: '填空题'
  }
  return typeMap[type] || type
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  
  // 如果数据库返回的是UTC时间（没有时区信息），需要手动转换为北京时间
  // 数据库格式如：2025-08-20 06:44:00 (UTC)
  // 需要转换为：2025-08-20 14:44:00 (北京时间)
  
  const date = new Date(dateString + '+00:00') // 明确指定为UTC时间
  
  // 检查是否为有效日期
  if (isNaN(date.getTime())) return '-'
  
  // 转换为北京时间显示
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const viewPaper = async (paper) => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/papers/${paper.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await response.json()
    
    if (result.success) {
      const paperData = result.data
      
      let content = `
        <div style="text-align: left; max-height: 500px; overflow-y: auto;">
          <h3>${paperData.title}</h3>
          <p><strong>科目：</strong>${paperData.subject || '未设置'}</p>
          <p><strong>描述：</strong>${paperData.description || '无'}</p>
          <p><strong>考试时长：</strong>${paperData.duration} 分钟</p>
          <p><strong>总分：</strong>${paperData.total_score} 分</p>
          <p><strong>及格分：</strong>${paperData.pass_score} 分</p>
          <p><strong>题目数量：</strong>${paperData.questions ? paperData.questions.length : 0} 题</p>
          <hr style="margin: 15px 0;">
      `
      
      if (paperData.questions && paperData.questions.length > 0) {
        content += '<h4>题目列表：</h4>'
        paperData.questions.forEach((question, index) => {
          content += `
            <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #409EFF;">
              <p><strong>${index + 1}. ${question.title}</strong> (${question.paper_questions?.score || question.score || '未设置'} 分)</p>
              <p>${question.content}</p>
              ${question.options && question.options.length ? `
                <ul style="margin: 5px 0;">
                  ${question.options.map(opt => `<li>${opt.key}. ${opt.value}</li>`).join('')}
                </ul>
              ` : ''}
              <p style="color: #67C23A;"><strong>答案：</strong>${question.correct_answer}</p>
            </div>
          `
        })
      } else {
        content += '<p style="color: #E6A23C;">该试卷暂无题目</p>'
      }
      
      content += '</div>'
      
      ElMessageBox.alert(content, '试卷预览', {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '关闭'
      })
    } else {
      ElMessage.error(result.message || '获取试卷详情失败')
    }
  } catch (error) {
    console.error('获取试卷详情失败:', error)
    ElMessage.error('获取试卷详情失败')
  }
}

const editPaper = async (paper) => {
  editMode.value = true
  Object.assign(paperForm, paper)
  currentStep.value = 0
  
  // 加载试卷的题目
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/papers/${paper.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await response.json()
    
    if (result.success && result.data.questions) {
      selectedQuestions.value = result.data.questions.map(q => ({
        ...q,
        score: q.paper_questions?.score || q.score || getDefaultScore(q.type)
      }))
    }
  } catch (error) {
    console.error('加载试卷题目失败:', error)
  }
  
  showCreateDialog.value = true
}

const handleCommand = async (command, paper) => {
  switch (command) {
    case 'publish':
      await publishPaper(paper.id)
      break
    case 'end':
      await endExam(paper.id)
      break
    case 'copy':
      await copyPaper(paper.id)
      break
    case 'delete':
      await deletePaper(paper.id)
      break
  }
}

const publishPaper = async (id) => {
  try {
    await ElMessageBox.confirm('确定要发布这份试卷吗？', '提示', {
      type: 'warning'
    })
    
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/papers/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_active: 1 })
    })
    
    const result = await response.json()
    if (result.success) {
      ElMessage.success('试卷发布成功')
      loadPapers()
    } else {
      ElMessage.error(result.message || '发布失败')
    }
  } catch {
    // 用户取消
  }
}

const endExam = async (id) => {
  try {
    await ElMessageBox.confirm('确定要结束这场考试吗？', '提示', {
      type: 'warning'
    })
    
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/papers/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_active: 0 })
    })
    
    const result = await response.json()
    if (result.success) {
      ElMessage.success('考试已结束')
      loadPapers()
    } else {
      ElMessage.error(result.message || '操作失败')
    }
  } catch {
    // 用户取消
  }
}

const copyPaper = async (id) => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/papers/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await response.json()
    
    if (result.success) {
      const originalPaper = result.data
      const copyData = {
        title: `${originalPaper.title} - 副本`,
        subject: originalPaper.subject,
        description: originalPaper.description,
        duration: originalPaper.duration,
        total_score: originalPaper.total_score,
        pass_score: originalPaper.pass_score,
        questions: originalPaper.questions ? originalPaper.questions.map(q => ({
          questionId: q.id,
          score: q.score || q.paper_questions?.score || getDefaultScore(q.type)
        })) : []
      }
      
      const createResponse = await fetch('/api/papers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(copyData)
      })
      
      const createResult = await createResponse.json()
      if (createResult.success) {
        ElMessage.success('试卷复制成功')
        loadPapers()
      } else {
        ElMessage.error(createResult.message || '复制失败')
      }
    }
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败')
  }
}

const deletePaper = async (id, force = false) => {
  try {
    const confirmMessage = force 
      ? '确定要强制删除这份试卷吗？这将删除所有相关的考试记录和安排，操作无法恢复。'
      : '确定要删除这份试卷吗？删除后无法恢复。'
    
    await ElMessageBox.confirm(confirmMessage, '警告', {
      type: 'warning',
      confirmButtonText: force ? '强制删除' : '确定删除',
      cancelButtonText: '取消',
      confirmButtonClass: force ? 'el-button--danger' : ''
    })
    
    const token = localStorage.getItem('token')
    const url = force ? `/api/papers/${id}?force=true` : `/api/papers/${id}`
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    if (result.success) {
      ElMessage.success(force ? '试卷强制删除成功' : '试卷删除成功')
      
      // 强制刷新列表
      await loadPapers()
      
      // 如果当前页没有数据了，跳转到上一页
      if (papers.value.length === 0 && pagination.page > 1) {
        pagination.page--
        await loadPapers()
      }
    } else {
      // 如果是依赖关系错误且提供强制删除选项
      if (result.forceDeleteAvailable && !force) {
        try {
          await ElMessageBox.confirm(
            `${result.message}\n\n是否要强制删除？这将删除所有相关数据。`,
            '删除失败',
            {
              type: 'warning',
              confirmButtonText: '强制删除',
              cancelButtonText: '取消',
              confirmButtonClass: 'el-button--danger'
            }
          )
          // 用户选择强制删除
          await deletePaper(id, true)
        } catch {
          // 用户取消强制删除
        }
      } else {
        ElMessage.error(result.message || '删除失败')
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除试卷失败:', error)
      ElMessage.error('删除试卷失败')
    }
  }
}

const nextStep = async () => {
  if (currentStep.value === 0) {
    try {
      await paperFormRef.value.validate()
      // 保存目标总分
      targetTotalScore.value = paperForm.total_score
      currentStep.value++
      // 进入选择题目步骤时，加载题目数据和统计信息
      await Promise.all([
        loadAvailableQuestions(),
        loadQuestionStatistics()
      ])
    } catch {
      // 验证失败
    }
  } else if (currentStep.value === 1) {
    if (selectedQuestions.value.length === 0) {
      ElMessage.warning('请至少选择一道题目')
      return
    }
    currentStep.value++
  }
}

const handleSelectionChange = (selection) => {
  // 如果正在更新选择状态，忽略此次变化
  if (isUpdatingSelection.value) {
    return
  }
  
  // 找出新选择的题目（在selection中但不在selectedQuestions中）
  const newSelections = selection.filter(selectedItem => 
    !selectedQuestions.value.find(q => q.id === selectedItem.id)
  )
  
  // 只处理在当前可见列表中的取消选择操作
  // 不处理因筛选导致的题目从列表中消失的情况
  const visibleSelectedIds = availableQuestions.value.map(q => q.id)
  const deselectedItems = selectedQuestions.value.filter(selectedItem => {
    // 只有在当前可见列表中的题目，且确实被取消选择了，才进行移除
    return visibleSelectedIds.includes(selectedItem.id) && 
           !selection.find(s => s.id === selectedItem.id)
  })
  
  // 添加新选择的题目
  newSelections.forEach(question => {
    selectedQuestions.value.push({
      ...question,
      score: getDefaultScore(question.type)
    })
  })
  
  // 移除取消选择的题目
  deselectedItems.forEach(deselectedItem => {
    const index = selectedQuestions.value.findIndex(q => q.id === deselectedItem.id)
    if (index > -1) {
      selectedQuestions.value.splice(index, 1)
    }
  })
  
  updateTotalScore()
}

const getDefaultScore = (type) => {
  // 优先使用自动组卷的分值配置，如果没有则使用默认值
  return autoScoreConfig[type] || {
    single: 2,
    multiple: 3,
    truefalse: 1,
    essay: 10,
    fill: 5
  }[type] || 1
}

const removeQuestion = (index) => {
  selectedQuestions.value.splice(index, 1)
  updateTotalScore()
}

const updateTotalScore = () => {
  const newTotalScore = selectedQuestions.value.reduce((sum, q) => sum + (q.score || 0), 0)
  paperForm.total_score = newTotalScore
  
  // 自动调整及格分数为总分的60%，向上取整
  if (newTotalScore > 0) {
    paperForm.pass_score = Math.ceil(newTotalScore * 0.6)
  }
}

const loadQuestionStatistics = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/questions/statistics/overview', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await response.json()
    if (result.success) {
      // 将统计结果转换为易用的格式
      const stats = {}
      if (Array.isArray(result.data)) {
        result.data.forEach(item => {
          stats[item.type] = item.count
        })
      }
      questionStatistics.value = {
        single: stats.single || 0,
        multiple: stats.multiple || 0,
        truefalse: stats.truefalse || 0,
        essay: stats.essay || 0,
        fill: stats.fill || 0
      }
    }
  } catch (error) {
    console.error('加载题目统计失败:', error)
    // 如果统计API失败，回退到空值
    questionStatistics.value = {
      single: 0,
      multiple: 0,
      truefalse: 0,
      essay: 0,
      fill: 0
    }
  }
}

const autoSelectQuestions = async () => {
  autoSelecting.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/questions?limit=1000', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    const result = await response.json()
    
    if (result.success) {
      const allQuestions = result.data.questions || []
      selectedQuestions.value = []
      
      // 按类型分组
      const questionsByType = {
        single: allQuestions.filter(q => q.type === 'single'),
        multiple: allQuestions.filter(q => q.type === 'multiple'),
        truefalse: allQuestions.filter(q => q.type === 'truefalse'),
        essay: allQuestions.filter(q => q.type === 'essay'),
        fill: allQuestions.filter(q => q.type === 'fill')
      }
      
      // 记录实际选择的数量
      const actualCounts = {
        single: 0,
        multiple: 0,
        truefalse: 0,
        essay: 0,
        fill: 0
      }
      
      const warnings = []
      
      // 随机选择题目
      Object.entries(autoConfig).forEach(([type, count]) => {
        if (count > 0) {
          const available = questionsByType[type] || []
          const availableCount = available.length
          
          if (availableCount === 0) {
            if (count > 0) {
              warnings.push(`${getTypeName(type)}：需要${count}题，但题库中没有此类型题目`)
            }
            return
          }
          
          if (availableCount < count) {
            warnings.push(`${getTypeName(type)}：需要${count}题，但题库中仅有${availableCount}题`)
          }
          
          // 实际选择的数量是需求数量和可用数量的最小值
          const actualSelectCount = Math.min(count, availableCount)
          actualCounts[type] = actualSelectCount
          
          // 随机选择题目
          const shuffled = [...available].sort(() => 0.5 - Math.random())
          const selected = shuffled.slice(0, actualSelectCount)
          
          selected.forEach(question => {
            selectedQuestions.value.push({
              ...question,
              score: autoScoreConfig[question.type] // 使用配置的分值
            })
          })
        }
      })
      
      updateTotalScore()
      
      // 生成结果消息
      let message = '自动选题完成！\n'
      let hasWarnings = false
      
      Object.entries(autoConfig).forEach(([type, requestedCount]) => {
        if (requestedCount > 0) {
          const actualCount = actualCounts[type]
          message += `${getTypeName(type)}：需要${requestedCount}题，实际选择${actualCount}题\n`
          if (actualCount < requestedCount) {
            hasWarnings = true
          }
        }
      })
      
      message += `\n总计选择了 ${selectedQuestions.value.length} 道题目`
      message += `\n实际总分：${paperForm.total_score} 分，及格分：${paperForm.pass_score} 分`
      
      if (warnings.length > 0) {
        message += '\n\n⚠️ 警告：\n' + warnings.join('\n')
      }
      
      if (selectedQuestions.value.length > 0) {
        if (hasWarnings) {
          ElMessageBox.alert(message, '自动选题完成（有警告）', {
            type: 'warning',
            confirmButtonText: '知道了'
          })
        } else {
          ElMessage.success('自动选题完成，数量完全匹配！')
        }
      } else {
        ElMessage.warning('没有找到符合条件的题目，请检查题库中是否有对应类型的题目')
      }
    } else {
      ElMessage.error(result.message || '获取题目失败')
    }
  } catch (error) {
    console.error('自动选题失败:', error)
    ElMessage.error('自动选题失败')
  } finally {
    autoSelecting.value = false
  }
}

const savePaper = async () => {
  saving.value = true
  try {
    const token = localStorage.getItem('token')
    
    // 构建试卷数据
    const paperData = {
      title: paperForm.title,
      subject: paperForm.subject,
      description: paperForm.description,
      duration: paperForm.duration,
      total_score: paperForm.total_score,
      pass_score: paperForm.pass_score,
      paper_type: paperForm.paper_type,
      exam_visible_time: paperForm.exam_visible_time,
      practice_visible: paperForm.practice_visible,
      questions: selectedQuestions.value.map(q => ({
        questionId: q.id,
        score: q.score
      }))
    }
    
    let response
    if (editMode.value) {
      response = await fetch(`/api/papers/${paperForm.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paperData)
      })
    } else {
      response = await fetch('/api/papers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paperData)
      })
    }
    
    const result = await response.json()
    if (result.success) {
      ElMessage.success(editMode.value ? '试卷更新成功' : '试卷创建成功')
      showCreateDialog.value = false
      loadPapers()
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  editMode.value = false
  currentStep.value = 0
  isUpdatingSelection.value = false // 重置标志位
  showBatchScoreDialog.value = false // 关闭批量设分对话框
  targetTotalScore.value = 100 // 重置目标总分
  Object.assign(paperForm, {
    id: null,
    title: '',
    subject: '',
    description: '',
    duration: 60,
    total_score: 100,
    pass_score: 60,
    paper_type: 'both',
    exam_visible_time: null,
    practice_visible: 1
  })
  selectedQuestions.value = []
  paperFormRef.value?.resetFields()
}

const onSelectionMethodChange = (newMethod) => {
  if (newMethod === 'manual') {
    // 切换到手动选择时，加载题目列表并保持已选状态
    loadAvailableQuestions()
  }
}

const getQuestionCount = (type) => {
  // 优先使用统计数据
  if (questionStatistics.value && questionStatistics.value[type] !== undefined) {
    return questionStatistics.value[type]
  }
  // 如果没有统计数据，使用allQuestions作为后备
  return allQuestions.value.filter(q => q.type === type).length
}

const calculateTotalScore = () => {
  return Object.entries(autoConfig).reduce((total, [type, count]) => {
    return total + (count * autoScoreConfig[type])
  }, 0)
}

const onTotalScoreChange = () => {
  targetTotalScore.value = paperForm.total_score
  // 同时更新及格分数
  paperForm.pass_score = Math.ceil(paperForm.total_score * 0.6)
}

const adjustScoresByTarget = () => {
  if (targetTotalScore.value <= 0) return
  
  // 计算总题目数
  const totalQuestions = Object.values(autoConfig).reduce((sum, count) => sum + count, 0)
  if (totalQuestions === 0) return
  
  // 计算平均分值
  const averageScore = targetTotalScore.value / totalQuestions
  
  // 根据题型难度系数调整分值
  const difficultyFactors = {
    single: 0.8,     // 单选题相对简单
    multiple: 1.2,   // 多选题相对复杂
    truefalse: 0.6,  // 判断题最简单
    essay: 2.0,      // 简答题最复杂
    fill: 1.0        // 填空题中等
  }
  
  // 计算调整后的分值
  const newScores = {}
  Object.keys(autoScoreConfig).forEach(type => {
    newScores[type] = Math.max(0.5, Math.round((averageScore * difficultyFactors[type]) * 2) / 2) // 保持0.5的精度
  })
  
  // 微调以达到目标总分
  const currentTotal = Object.entries(autoConfig).reduce((sum, [type, count]) => {
    return sum + (count * newScores[type])
  }, 0)
  
  if (currentTotal !== targetTotalScore.value && totalQuestions > 0) {
    const adjustment = (targetTotalScore.value - currentTotal) / totalQuestions
    Object.keys(newScores).forEach(type => {
      if (autoConfig[type] > 0) {
        newScores[type] = Math.max(0.5, Math.round((newScores[type] + adjustment) * 2) / 2)
      }
    })
  }
  
  // 应用新分值
  Object.assign(autoScoreConfig, newScores)
}

const getSelectedQuestionTypes = () => {
  const types = new Set(selectedQuestions.value.map(q => q.type))
  return Array.from(types)
}

const getSelectedQuestionCountByType = (type) => {
  return selectedQuestions.value.filter(q => q.type === type).length
}

const clearSelectedQuestions = () => {
  selectedQuestions.value = []
  updateTotalScore()
}

const applyBatchScore = () => {
  if (batchScoreForm.method === 'uniform') {
    // 统一分值
    selectedQuestions.value.forEach(question => {
      question.score = batchScoreForm.uniformScore
    })
  } else {
    // 按题型设置
    selectedQuestions.value.forEach(question => {
      if (batchScoreForm.typeScores[question.type]) {
        question.score = batchScoreForm.typeScores[question.type]
      }
    })
  }
  
  updateTotalScore()
  showBatchScoreDialog.value = false
  ElMessage.success(`批量设分完成！总分已更新为 ${paperForm.total_score} 分，及格分为 ${paperForm.pass_score} 分`)
}

const resetToDefaultScores = () => {
  Object.assign(autoScoreConfig, {
    single: 2,
    multiple: 3,
    truefalse: 1,
    essay: 10,
    fill: 5
  })
  ElMessage.success('已恢复默认分值')
}

const openCreateDialog = async () => {
  showCreateDialog.value = true
  // 预加载统计数据，这样在自动组卷时可以立即显示题目数量
  await loadQuestionStatistics()
}

onMounted(() => {
  loadPapers()
  loadQuestionStatistics() // 初始加载统计信息
})
</script>

<style scoped>
.paper-manage {
  padding: 20px;
}

.page-header .header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-section {
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.question-selection {
  margin-top: 20px;
}

.selection-methods {
  margin-bottom: 20px;
}

.question-filter {
  margin-bottom: 20px;
}

.question-lists {
  display: flex;
  gap: 20px;
}

.available-questions,
.selected-questions {
  flex: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.paper-preview,
.paper-summary {
  padding: 20px 0;
}

.question-summary {
  margin-top: 20px;
}
</style>
